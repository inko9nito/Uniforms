import generated from './inventory.generated.json';

export type SchoolName = 'Carrollton' | 'Frisco';

/** Polaris Badge tones we use for the availability badge. */
export type BadgeTone = 'success' | 'attention' | 'subdued';

export interface AvailabilityBadge {
  label: string;
  tone: BadgeTone;
}

/** One physical garment belonging to a product listing. */
export interface Instance {
  /** e.g. "Gray polo #2". */
  label: string;
  /** e.g. "Good", "Has blemish", "New with tags". */
  condition: string;
  /** Free-text detail about a flaw, e.g. "Small marker blemish". */
  conditionNotes?: string;
  status: 'Available' | 'Reserved' | 'Sold' | string;
  /** Per-item price; null only if Airtable left it blank. */
  price: number | null;
}

export interface Item {
  id: string;
  section: string;
  name: string;
  /** Name shown to buyers — prefixed with the section (Girls/Boys) unless unisex. */
  displayName: string;
  size: string;
  schools: SchoolName[];
  /** Short condition summary for the card (distinct conditions across instances). */
  note?: string;
  /** Lowest available instance price. Kept as `unitPrice` for back-compat. */
  unitPrice: number;
  priceMin: number;
  priceMax: number;
  /** Airtable's pre-formatted range string, e.g. "$3–$5". */
  priceDisplay?: string;
  /** Count of buyable instances. 0 means none available right now. Aliased as `quantity`. */
  quantity: number;
  availableCount: number;
  reservedCount: number;
  /** Mirrors Airtable's availability formula (available wins over reserved). */
  badge: AvailabilityBadge;
  /** Photo paths (in repo, e.g. images/foo.jpg) or URLs. Empty falls back to an illustration. */
  images: string[];
  /** Optional link to the original store listing where the item was bought. */
  sourceUrl?: string;
  /** Retained for the (now dormant) GitHub editor; 0 since data comes from Airtable. */
  sourceLine: number;
  /** Per-garment breakdown, sorted available → reserved → sold. */
  instances: Instance[];
}

/** Shape of each entry in inventory.generated.json (produced by scripts/fetch-airtable.mjs). */
interface GeneratedProduct {
  id: string;
  section: string;
  name: string;
  size: string;
  schools: SchoolName[];
  note?: string;
  priceMin: number;
  priceMax: number;
  priceDisplay?: string;
  availableCount: number;
  reservedCount: number;
  badge: AvailabilityBadge;
  images: string[];
  sourceUrl?: string;
  instances: Instance[];
}

/** Absolute URLs pass through; repo-relative paths resolve against the site base. */
export function resolveImage(src: string): string {
  if (/^https?:\/\//.test(src)) return src;
  return import.meta.env.BASE_URL + src.replace(/^\/+/, '');
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

/** Girls/Boys items get a section prefix; Unisex (and anything else) keep their plain name. */
function displayNameFor(section: string, name: string): string {
  if (section === 'Girls' || section === 'Boys') return `${section} ${name}`;
  return name;
}

/**
 * Polaris <Badge> has no "subdued" tone — its default (no tone) badge is the
 * gray one. Map our semantic tone onto what the component accepts.
 */
export function polarisBadgeTone(tone: BadgeTone): 'success' | 'attention' | undefined {
  return tone === 'subdued' ? undefined : tone;
}

/** "$5" for a single price, "$3–$5" for a range. */
export function priceLabel(item: Pick<Item, 'priceMin' | 'priceMax'>): string {
  return item.priceMin === item.priceMax
    ? `$${item.priceMin}`
    : `$${item.priceMin}–$${item.priceMax}`;
}

/** A listing is sold out only when nothing is available AND nothing is reserved. */
export function isSoldOut(item: Pick<Item, 'availableCount' | 'reservedCount'>): boolean {
  return item.availableCount <= 0 && item.reservedCount <= 0;
}

function toItem(p: GeneratedProduct): Item {
  return {
    ...p,
    displayName: displayNameFor(p.section, p.name),
    unitPrice: p.priceMin,
    quantity: p.availableCount,
    sourceLine: 0,
  };
}

export const ITEMS: Item[] = (generated as GeneratedProduct[]).map(toItem);
