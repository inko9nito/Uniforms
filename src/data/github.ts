import { REPO_OWNER, REPO_NAME, REPO_BRANCH } from './inventory';

const API = 'https://api.github.com';
const REPO = `${REPO_OWNER}/${REPO_NAME}`;

export const TOKEN_KEY = 'fca-github-token';

export function loadToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

export function saveToken(token: string): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

interface FileResult {
  content: string;
  sha: string;
}

async function ghFetch(token: string, path: string, opts?: RequestInit): Promise<Response> {
  const res = await fetch(`${API}/repos/${REPO}/contents/${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...((opts?.headers as Record<string, string>) ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `GitHub ${res.status}`);
  }
  return res;
}

export async function getFile(token: string, path: string): Promise<FileResult> {
  const res = await ghFetch(token, path);
  const data = await res.json();
  return {
    content: decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))),
    sha: data.sha as string,
  };
}

export async function putFile(
  token: string,
  path: string,
  base64Content: string,
  sha: string | null,
  message: string,
): Promise<void> {
  const body: Record<string, unknown> = { message, content: base64Content, branch: REPO_BRANCH };
  if (sha) body.sha = sha;
  await ghFetch(token, path, { method: 'PUT', body: JSON.stringify(body) });
}

/** Convert a File to base64 (the raw base64 GitHub expects, no data-URL prefix). */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/** Fetch an external URL as base64 (proxied via the same-origin limit won't apply to public images). */
export async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch image: ${res.status}`);
  const blob = await res.blob();
  return fileToBase64(new File([blob], 'photo.jpg', { type: blob.type }));
}

/** Add an image reference to a specific row in inventory.md. */
export function addImageToInventoryContent(
  mdContent: string,
  sourceLine: number,
  imagePath: string,
): string {
  const lines = mdContent.split('\n');
  const idx = sourceLine - 1;
  const line = lines[idx];
  if (!line) throw new Error('Row not found in inventory');

  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = inner.split('|').map((c) => c.trim());

  // Column order: Section(0) Item(1) Size(2) Schools(3) Condition(4) Price(5) Qty(6) Image(7) Link(8)
  const existing = cells[7] ?? '';
  cells[7] = existing ? `${existing}, ${imagePath}` : imagePath;

  lines[idx] = '| ' + cells.join(' | ') + ' |';
  return lines.join('\n');
}

/** Remove an image reference from a specific row in inventory.md. */
export function removeImageFromInventoryContent(
  mdContent: string,
  sourceLine: number,
  imagePath: string,
): string {
  const lines = mdContent.split('\n');
  const idx = sourceLine - 1;
  const line = lines[idx];
  if (!line) throw new Error('Row not found in inventory');

  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = inner.split('|').map((c) => c.trim());

  const existing = cells[7] ?? '';
  const updated = existing
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s && s !== imagePath)
    .join(', ');
  cells[7] = updated;

  lines[idx] = '| ' + cells.join(' | ') + ' |';
  return lines.join('\n');
}

// Column order in inventory.md:
// Section(0) Item(1) Size(2) Schools(3) Condition(4) Price(5) Qty(6) Image(7) Link(8)
const COL = { size: 2, condition: 4, qty: 6, image: 7 } as const;

/** Set a single cell (by column index) in a specific row of inventory.md. */
export function setInventoryCell(
  mdContent: string,
  sourceLine: number,
  colIndex: number,
  value: string,
): string {
  const lines = mdContent.split('\n');
  const idx = sourceLine - 1;
  const line = lines[idx];
  if (!line) throw new Error('Row not found in inventory');

  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = inner.split('|').map((c) => c.trim());
  cells[colIndex] = value;

  lines[idx] = '| ' + cells.join(' | ') + ' |';
  return lines.join('\n');
}

export const setInventorySize = (md: string, line: number, size: string) =>
  setInventoryCell(md, line, COL.size, size);

export const setInventoryCondition = (md: string, line: number, condition: string) =>
  setInventoryCell(md, line, COL.condition, condition);

export const setInventoryQuantity = (md: string, line: number, qty: number) =>
  setInventoryCell(md, line, COL.qty, String(qty));

/** Replace the full ordered image list for a row (used for reorder and remove). */
export const setInventoryImages = (md: string, line: number, images: string[]) =>
  setInventoryCell(md, line, COL.image, images.join(', '));

/** Slugify a string for use as a filename. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
