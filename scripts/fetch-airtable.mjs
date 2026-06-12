// Build-time Airtable -> JSON sync. Runs in GitHub Actions so the token stays
// server-side and never ships in the browser bundle. Required env:
//   AIRTABLE_TOKEN  read-only PAT scoped to the Uniforms base (data.records:read)
//
// Output:
//   src/data/inventory.generated.json  one entry per published product, with a
//                                       per-instance breakdown, price range, and
//                                       availability badge.
//   public/images/airtable/*           product + instance photos, downloaded
//                                       locally because Airtable attachment URLs
//                                       expire and must not be hot-linked.
//
// The transform (`buildProducts`) is exported and shape-agnostic: it accepts
// records from the REST API (selects as plain strings) as well as already
// enriched records (selects as { name } objects), so the same logic can be
// reused to regenerate a committed snapshot from a local dump.
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE_ID = 'apphC2zBEMewkcgq7';
const PRODUCTS_TABLE = 'tbl3pn2gOaw715XbJ'; // Uniform Inventory
const INSTANCES_TABLE = 'tblaYze436czhC5o5'; // Item Instances
const API = `https://api.airtable.com/v0/${BASE_ID}`;

export const IMAGE_DIR = path.resolve('public/images/airtable');
export const OUT_JSON = path.resolve('src/data/inventory.generated.json');

// Field IDs are stable even when a field is renamed in the Airtable UI, so we
// key everything by ID (and ask the API to return fields by ID too).
const F = {
  // Uniform Inventory
  item: 'fld65XJe9jg26AoFk',
  photo: 'fld5Oq6Q4SCwdTtbH', // "Official product photo"
  gender: 'fldNZguKSmUcvjlmf',
  size: 'fldh03fOzfk9cbAb6',
  campus: 'fldad07lOv6RpBdlt',
  priceRollup: 'fldXaV0jjDKPPUhEw',
  qtyAvailable: 'fld4SXW0Dr2UaKZv7',
  qtyReserved: 'fld1HqmGYyKXl130L',
  link: 'fldFrNTrYCFTD75Yr',
  instances: 'fldckQLwt0vHmxOOv',
  visibility: 'fldoBk5dezjgiJEmN',
  // Item Instances
  instLabel: 'fldWRv8cbrJK7y3qF',
  instProduct: 'fldxSRAinGhnKsitp',
  instCondition: 'fldnzkggxRswGAB8g',
  instConditionNotes: 'flduHHGmT5rGKnwfp',
  instStatus: 'fldKsm9PIsaM0C42e',
  instPrice: 'fldh1OGMY276L26Nd',
  instPhoto: 'flds9xhrDWyavNoPE',
};

const GENDER_RANK = { Girls: 0, Boys: 1, Unisex: 2 };
const STATUS_RANK = { Available: 0, Reserved: 1, Sold: 2 };

/** singleSelect comes back as a string (REST) or { name } (enriched). */
function selName(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.length ? selName(v[0]) : null;
  if (typeof v === 'object') return v.name ?? null;
  return String(v);
}

function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function text(v) {
  return String(v ?? '').trim();
}

/** multipleSelects -> the two campuses the site knows about. */
function schoolsFrom(campus) {
  const arr = Array.isArray(campus) ? campus : campus ? [campus] : [];
  const names = arr.map((c) => (typeof c === 'string' ? c : (c?.name ?? '')));
  const out = [];
  if (names.some((c) => /^carr/i.test(c))) out.push('Carrollton');
  if (names.some((c) => /^fri/i.test(c))) out.push('Frisco');
  return out.length ? out : ['Carrollton'];
}

/** Mirrors the Airtable "Availability" formula: available wins over reserved. */
function badgeFor(available, reserved) {
  if (available > 0) return { label: `${available} available`, tone: 'success' };
  if (reserved > 0) return { label: `${reserved} reserved`, tone: 'attention' };
  return { label: 'Sold out', tone: 'subdued' };
}

/** A linked-record cell is an array of id strings (REST) or { id } objects. */
function linkId(link) {
  return typeof link === 'string' ? link : link?.id;
}

/**
 * Pure transform: products + instances -> JSON-ready product rows. Each row
 * carries a temporary `_atts` array of attachment objects to download.
 */
export function buildProducts(products, instances) {
  const byProduct = new Map();
  for (const inst of instances) {
    const links = inst.fields[F.instProduct] ?? [];
    for (const link of links) {
      const pid = linkId(link);
      if (!pid) continue;
      if (!byProduct.has(pid)) byProduct.set(pid, []);
      byProduct.get(pid).push(inst);
    }
  }

  const rows = [];
  for (const product of products) {
    const f = product.fields;
    const name = text(f[F.item]);
    if (!name) continue;
    if (selName(f[F.visibility]) === 'Unpublished') continue; // keep drafts off the site

    const kids = byProduct.get(product.id) ?? [];
    const available = kids.filter((k) => selName(k.fields[F.instStatus]) === 'Available');
    const reserved = kids.filter((k) => selName(k.fields[F.instStatus]) === 'Reserved');
    const nonSold = kids.filter((k) => selName(k.fields[F.instStatus]) !== 'Sold');

    // Price range. Prefer buyable instances, then non-sold, then fall back to
    // all instances (incl. sold) so a fully sold-out listing still shows its
    // original price rather than $0.
    const pool = available.length ? available : nonSold.length ? nonSold : kids;
    const prices = pool.map((k) => asNumber(k.fields[F.instPrice])).filter((n) => n != null && n > 0);
    const priceMin = prices.length ? Math.min(...prices) : 0;
    const priceMax = prices.length ? Math.max(...prices) : priceMin;

    const availableCount = asNumber(f[F.qtyAvailable]) ?? available.length;
    const reservedCount = asNumber(f[F.qtyReserved]) ?? reserved.length;

    // Short condition summary for the card (distinct conditions, with notes).
    const conditionSummary = [
      ...new Set(
        pool
          .map((k) => {
            const c = selName(k.fields[F.instCondition]) ?? '';
            const n = text(k.fields[F.instConditionNotes]);
            return n ? `${c} — ${n}` : c;
          })
          .filter(Boolean),
      ),
    ].join('; ');

    const instanceList = [...kids]
      .sort((a, b) => {
        const sa = STATUS_RANK[selName(a.fields[F.instStatus])] ?? 9;
        const sb = STATUS_RANK[selName(b.fields[F.instStatus])] ?? 9;
        if (sa !== sb) return sa - sb;
        return (asNumber(a.fields[F.instPrice]) ?? 0) - (asNumber(b.fields[F.instPrice]) ?? 0);
      })
      .map((k) => ({
        label: text(k.fields[F.instLabel]),
        condition: selName(k.fields[F.instCondition]) ?? '',
        conditionNotes: text(k.fields[F.instConditionNotes]) || undefined,
        status: selName(k.fields[F.instStatus]) ?? '',
        price: asNumber(k.fields[F.instPrice]),
        // Temp fields consumed in generate(); stripped before write.
        _id: k.id,
        _atts: Array.isArray(k.fields[F.instPhoto]) ? k.fields[F.instPhoto] : [],
      }));

    // The top gallery shows only the official product photo(s); each
    // individual garment's own photo rides on its instance (see generate()).
    const productAtts = Array.isArray(f[F.photo]) ? f[F.photo] : [];

    rows.push({
      id: product.id,
      section: selName(f[F.gender]) ?? 'Unisex',
      name,
      size: text(f[F.size]),
      schools: schoolsFrom(f[F.campus]),
      note: conditionSummary || undefined,
      priceMin,
      priceMax,
      priceDisplay: text(f[F.priceRollup]) || undefined,
      availableCount,
      reservedCount,
      badge: badgeFor(availableCount, reservedCount),
      images: [],
      sourceUrl: text(f[F.link]) || undefined,
      instances: instanceList,
      _atts: productAtts,
    });
  }

  rows.sort(
    (a, b) =>
      (GENDER_RANK[a.section] ?? 9) - (GENDER_RANK[b.section] ?? 9) ||
      a.name.localeCompare(b.name),
  );
  return rows;
}

async function fetchAll(tableId, token) {
  const records = [];
  let offset;
  do {
    const url = new URL(`${API}/${tableId}`);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('returnFieldsByFieldId', 'true');
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Airtable ${res.status} for ${tableId}: ${await res.text()}`);
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

async function downloadImage(att, baseName) {
  const url = typeof att === 'string' ? att : att.url;
  const filename = typeof att === 'object' ? (att.filename ?? '') : '';
  let ext = (String(filename).match(/\.[a-z0-9]+$/i)?.[0] ?? '.jpg').toLowerCase();
  if (ext === '.jpeg') ext = '.jpg';
  const fileName = `${baseName}${ext}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image download failed (${res.status})`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(path.join(IMAGE_DIR, fileName)));
  return `images/airtable/${fileName}`;
}

/** Build rows, download their images, and write the JSON snapshot. */
export async function generate(products, instances) {
  await rm(IMAGE_DIR, { recursive: true, force: true });
  await mkdir(IMAGE_DIR, { recursive: true });

  const rows = buildProducts(products, instances);
  for (const row of rows) {
    const images = [];
    for (let i = 0; i < row._atts.length; i++) {
      try {
        images.push(await downloadImage(row._atts[i], `${row.id}-${i}`));
      } catch (err) {
        console.warn(`  ! skipped a product image for ${row.name}: ${err.message}`);
      }
    }
    row.images = images;
    delete row._atts;

    // Each instance keeps its own "Actual photo" (the real garment), shown on
    // its card in the detail panel.
    for (const inst of row.instances) {
      const atts = inst._atts ?? [];
      if (atts.length) {
        try {
          inst.image = await downloadImage(atts[0], `${inst._id}-0`);
        } catch (err) {
          console.warn(`  ! skipped an instance image for ${inst.label}: ${err.message}`);
        }
      }
      delete inst._atts;
      delete inst._id;
    }
  }

  await mkdir(path.dirname(OUT_JSON), { recursive: true });
  await writeFile(OUT_JSON, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  return rows;
}

async function main() {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    console.error('Missing AIRTABLE_TOKEN');
    process.exit(1);
  }
  const [products, instances] = await Promise.all([
    fetchAll(PRODUCTS_TABLE, token),
    fetchAll(INSTANCES_TABLE, token),
  ]);
  const rows = await generate(products, instances);
  console.log(`Wrote ${rows.length} products (${instances.length} instances scanned).`);
}

// Only hit the network when run directly; importing the module (to reuse the
// transform) must not trigger a fetch.
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
