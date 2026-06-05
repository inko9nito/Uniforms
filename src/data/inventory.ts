import inventoryMd from '../../inventory.md?raw';

export type SchoolName = 'Carrollton' | 'Frisco';

export interface Item {
  id: string;
  section: string;
  name: string;
  size: string;
  schools: SchoolName[];
  note?: string;
  unitPrice: number;
  lotPrice: number;
  /** How many of this item are currently available. 0 means sold out. */
  quantity: number;
  /** Optional photo path (in repo, e.g. images/foo.jpg) or URL. Falls back to an illustration. */
  image?: string;
  /** 1-based line number of this row in inventory.md, for deep-linking to the editor. */
  sourceLine: number;
}

/** GitHub repo coordinates, used to build "edit on GitHub" links. */
export const REPO_OWNER = 'inko9nito';
export const REPO_NAME = 'Uniforms';
export const REPO_BRANCH = 'main';
export const INVENTORY_PATH = 'inventory.md';

export const EDIT_INVENTORY_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/edit/${REPO_BRANCH}/${INVENTORY_PATH}`;

export function editLineUrl(line: number): string {
  return `${EDIT_INVENTORY_URL}#L${line}`;
}

function parseSchools(raw: string): SchoolName[] {
  const value = raw.trim().toLowerCase();
  if (value === 'both') return ['Carrollton', 'Frisco'];
  const out: SchoolName[] = [];
  for (const part of raw.split(/[,/&]| and /i)) {
    const t = part.trim().toLowerCase();
    if (t.startsWith('carr') && !out.includes('Carrollton')) out.push('Carrollton');
    else if (t.startsWith('fri') && !out.includes('Frisco')) out.push('Frisco');
  }
  return out.length ? out : ['Carrollton'];
}

function splitRow(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  return inner.split('|').map((c) => c.trim());
}

const isSeparator = (cells: string[]) =>
  cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c));

/** Blank quantity defaults to 1; non-numbers and negatives clamp sensibly. */
function quantityFrom(raw: string): number {
  const t = raw.trim();
  if (t === '') return 1;
  const n = Math.floor(Number(t));
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

export function parseInventory(md: string): Item[] {
  const lines = md.split('\n');
  const items: Item[] = [];
  let headers: string[] | null = null;
  let idx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) {
      headers = null; // a blank/non-table line ends the current table
      continue;
    }

    const cells = splitRow(line);
    if (isSeparator(cells)) continue;

    if (!headers) {
      headers = cells.map((c) => c.toLowerCase());
      continue;
    }

    const get = (needle: string) => {
      const k = headers!.findIndex((h) => h.includes(needle));
      return k >= 0 ? cells[k] ?? '' : '';
    };

    const name = get('item');
    if (!name) continue;

    items.push({
      id: `item-${idx}`,
      section: get('section') || 'Other',
      name,
      size: get('size'),
      schools: parseSchools(get('school')),
      note: get('condition') || undefined,
      unitPrice: Number(get('unit')) || 0,
      lotPrice: Number(get('lot')) || 0,
      quantity: quantityFrom(get('qty')),
      image: get('image') || undefined,
      sourceLine: i + 1,
    });
    idx++;
  }

  return items;
}

export const ITEMS = parseInventory(inventoryMd);
