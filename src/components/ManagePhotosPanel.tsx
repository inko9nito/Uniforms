import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Select } from './ui/select';
import type { Item, SchoolName } from '../data/inventory';
import { resolveImage } from '../data/inventory';
import { cn } from '../lib/utils';
import {
  addImageToInventoryContent,
  COL,
  fileToBase64,
  getFile,
  loadToken,
  putFile,
  saveToken,
  setInventoryCells,
  setInventoryImages,
  slugify,
} from '../data/github';

interface Props {
  item: Item;
  /** Called after a successful save so the detail view can reflect edits
      optimistically, before the site rebuilds from the new inventory.md. */
  onItemPatched: (patch: Partial<Item>) => void;
}

type Status =
  | { type: 'idle' }
  | { type: 'busy'; msg: string }
  | { type: 'error'; msg: string }
  | { type: 'done' };

const GENDER_OPTIONS = ['Girls', 'Boys', 'Unisex'];
const CAMPUS_CHOICES: SchoolName[] = ['Carrollton', 'Frisco'];

const inputClass =
  'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-ink shadow-sm transition-colors placeholder:text-neutral-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50';

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

/** Serialize the selected campuses back to the inventory.md Schools cell. */
function formatSchools(selected: string[]): string {
  const both = selected.includes('Carrollton') && selected.includes('Frisco');
  if (both) return 'Both';
  if (selected.length > 0) return selected.join(', ');
  return 'Carrollton';
}

/** Selected campus values → the parsed SchoolName[] the detail view expects. */
function campusToSchools(selected: string[]): SchoolName[] {
  const out = selected.filter((s): s is SchoolName => s === 'Carrollton' || s === 'Frisco');
  return out.length > 0 ? out : ['Carrollton'];
}

/** Mirror inventory.ts: Girls/Boys get a section prefix, everything else is plain. */
function displayNameFor(section: string, name: string): string {
  return section === 'Girls' || section === 'Boys' ? `${section} ${name}` : name;
}

export function ManagePhotosPanel({ item, onItemPatched }: Props) {
  const [token, setToken] = useState(loadToken);
  const [tokenDraft, setTokenDraft] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [status, setStatus] = useState<Status>({ type: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);

  // Editable drafts, seeded from the item and re-seeded when a different item opens.
  const [titleDraft, setTitleDraft] = useState(item.name);
  const [genderDraft, setGenderDraft] = useState(item.section);
  const [campusDraft, setCampusDraft] = useState<string[]>(item.schools);
  const [sizeDraft, setSizeDraft] = useState(item.size);
  const [conditionDraft, setConditionDraft] = useState(item.note ?? '');
  const [priceDraft, setPriceDraft] = useState(String(item.unitPrice));
  const [qtyDraft, setQtyDraft] = useState(String(item.quantity));
  const [linkDraft, setLinkDraft] = useState(item.sourceUrl ?? '');
  const [images, setImages] = useState<string[]>(item.images);

  useEffect(() => {
    setTitleDraft(item.name);
    setGenderDraft(item.section);
    setCampusDraft(item.schools);
    setSizeDraft(item.size);
    setConditionDraft(item.note ?? '');
    setPriceDraft(String(item.unitPrice));
    setQtyDraft(String(item.quantity));
    setLinkDraft(item.sourceUrl ?? '');
    setImages(item.images);
  }, [item]);

  const hasToken = token.length > 0;
  const busy = status.type === 'busy';

  // Gender options always include the item's current section, even if it's
  // something custom (e.g. "Other") that isn't in the standard list.
  const genderNames = GENDER_OPTIONS.includes(item.section)
    ? GENDER_OPTIONS
    : [item.section, ...GENDER_OPTIONS];
  const genderOptions = genderNames.map((g) => ({ label: g, value: g }));

  function handleSaveToken() {
    const t = tokenDraft.trim();
    saveToken(t);
    setToken(t);
    setTokenDraft('');
    setShowTokenInput(false);
  }

  function toggleCampus(name: SchoolName, checked: boolean) {
    setCampusDraft((prev) =>
      checked ? [...new Set([...prev, name])] : prev.filter((c) => c !== name),
    );
  }

  /** Fetch inventory.md, apply a transform, and commit it back. */
  async function patchInventory(transform: (content: string) => string, message: string) {
    const { content, sha } = await getFile(token, 'inventory.md');
    const updated = transform(content);
    await putFile(token, 'inventory.md', btoa(unescape(encodeURIComponent(updated))), sha, message);
  }

  async function handleSaveDetails() {
    const title = titleDraft.trim();
    const size = sizeDraft.trim();
    const condition = conditionDraft.trim();
    const price = Math.max(0, Number(priceDraft));
    const qty = Math.max(0, Math.floor(Number(qtyDraft)));
    if (!title) {
      setStatus({ type: 'error', msg: 'Title cannot be empty' });
      return;
    }
    if (!Number.isFinite(price)) {
      setStatus({ type: 'error', msg: 'Price must be a number' });
      return;
    }
    if (!Number.isFinite(qty)) {
      setStatus({ type: 'error', msg: 'Quantity must be a number' });
      return;
    }
    const updates: Record<number, string> = {
      [COL.item]: title,
      [COL.section]: genderDraft,
      [COL.schools]: formatSchools(campusDraft),
      [COL.size]: size,
      [COL.condition]: condition,
      [COL.price]: String(price),
      [COL.qty]: String(qty),
      [COL.link]: linkDraft.trim(),
    };
    try {
      setStatus({ type: 'busy', msg: 'Saving details…' });
      await patchInventory(
        (content) => setInventoryCells(content, item.sourceLine, updates),
        `Update ${title}: details`,
      );
      setStatus({ type: 'done' });
      onItemPatched({
        name: title,
        displayName: displayNameFor(genderDraft, title),
        section: genderDraft,
        schools: campusToSchools(campusDraft),
        size,
        note: condition || undefined,
        unitPrice: price,
        quantity: qty,
        sourceUrl: linkDraft.trim() || undefined,
      });
    } catch (err) {
      setStatus({ type: 'error', msg: (err as Error).message });
    }
  }

  async function commitImage(base64: string, mimeType: string) {
    const ext = mimeType.includes('png')
      ? 'png'
      : mimeType.includes('gif')
        ? 'gif'
        : mimeType.includes('webp')
          ? 'webp'
          : 'jpg';
    const safeName = `${slugify(item.name)}-${Date.now()}.${ext}`;
    const imagePath = `images/${safeName}`;
    const repoPath = `public/images/${safeName}`;

    setStatus({ type: 'busy', msg: 'Uploading photo…' });
    await putFile(token, repoPath, base64, null, `Add photo for ${item.displayName}`);

    setStatus({ type: 'busy', msg: 'Updating inventory…' });
    await patchInventory(
      (content) => addImageToInventoryContent(content, item.sourceLine, imagePath),
      `Add photo to ${item.displayName}`,
    );

    setImages((prev) => {
      const next = [...prev, imagePath];
      onItemPatched({ images: next });
      return next;
    });
    setStatus({ type: 'done' });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      await commitImage(base64, file.type);
    } catch (err) {
      setStatus({ type: 'error', msg: (err as Error).message });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleAddUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    try {
      setStatus({ type: 'busy', msg: 'Updating inventory…' });
      await patchInventory(
        (content) => addImageToInventoryContent(content, item.sourceLine, url),
        `Add photo URL to ${item.displayName}`,
      );
      setImages((prev) => {
        const next = [...prev, url];
        onItemPatched({ images: next });
        return next;
      });
      setUrlDraft('');
      setStatus({ type: 'done' });
    } catch (err) {
      setStatus({ type: 'error', msg: (err as Error).message });
    }
  }

  /** Commit a new ordered image list (used for both remove and reorder). */
  async function commitImageOrder(next: string[], message: string) {
    const prev = images;
    setImages(next);
    onItemPatched({ images: next }); // optimistic
    try {
      setStatus({ type: 'busy', msg: 'Saving photos…' });
      await patchInventory((content) => setInventoryImages(content, item.sourceLine, next), message);
      setStatus({ type: 'done' });
    } catch (err) {
      setImages(prev);
      onItemPatched({ images: prev }); // roll back
      setStatus({ type: 'error', msg: (err as Error).message });
    }
  }

  function handleRemovePhoto(src: string) {
    if (!hasToken) return;
    commitImageOrder(images.filter((s) => s !== src), `Remove photo from ${item.displayName}`);
  }

  function handleMove(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target]!, next[index]!];
    commitImageOrder(next, `Reorder photos for ${item.displayName}`);
  }

  const detailsDirty =
    titleDraft.trim() !== item.name ||
    genderDraft !== item.section ||
    formatSchools(campusDraft) !== formatSchools(item.schools) ||
    sizeDraft.trim() !== item.size ||
    conditionDraft.trim() !== (item.note ?? '') ||
    priceDraft.trim() !== String(item.unitPrice) ||
    qtyDraft.trim() !== String(item.quantity) ||
    linkDraft.trim() !== (item.sourceUrl ?? '');

  return (
    <div className="flex flex-col gap-4">
      {/* Token setup */}
      {!hasToken && !showTokenInput && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-900">A GitHub token is required to save changes.</p>
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => setShowTokenInput(true)}>
              Set up token
            </Button>
          </div>
        </div>
      )}

      {showTokenInput && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-soft">
            Create a{' '}
            <a
              href="https://github.com/settings/tokens/new?description=FCA+Uniform+Resale&scopes=repo"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand hover:underline"
            >
              GitHub personal access token
            </a>{' '}
            with <strong>repo</strong> scope. Stored only in this browser.
          </p>
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={tokenDraft}
              onChange={(e) => setTokenDraft(e.target.value)}
              type="password"
              placeholder="ghp_…"
            />
            <Button size="md" onClick={handleSaveToken} disabled={!tokenDraft.trim()}>
              Save
            </Button>
          </div>
          <button
            type="button"
            className="self-start text-sm font-semibold text-ink-soft hover:underline"
            onClick={() => {
              setShowTokenInput(false);
              setTokenDraft('');
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {hasToken && !showTokenInput && (
        <button
          type="button"
          className="self-end text-sm font-semibold text-ink-soft hover:underline"
          onClick={() => {
            setShowTokenInput(true);
            setTokenDraft('');
          }}
        >
          Change token
        </button>
      )}

      {/* Details */}
      {hasToken && (
        <div className="flex flex-col gap-3">
          <Labeled label="Title">
            <input className={inputClass} value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} disabled={busy} />
          </Labeled>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Gender">
              <Select
                value={genderDraft}
                onValueChange={setGenderDraft}
                options={genderOptions}
                disabled={busy}
                ariaLabel="Gender"
              />
            </Labeled>
            <Labeled label="Size">
              <input className={inputClass} value={sizeDraft} onChange={(e) => setSizeDraft(e.target.value)} disabled={busy} />
            </Labeled>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Price">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">$</span>
                <input
                  className={cn(inputClass, 'pl-7')}
                  type="number"
                  min={0}
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  disabled={busy}
                />
              </div>
            </Labeled>
            <Labeled label="Qty">
              <input
                className={inputClass}
                type="number"
                min={0}
                value={qtyDraft}
                onChange={(e) => setQtyDraft(e.target.value)}
                disabled={busy}
              />
            </Labeled>
          </div>
          <Labeled label="Condition">
            <input
              className={inputClass}
              value={conditionDraft}
              onChange={(e) => setConditionDraft(e.target.value)}
              disabled={busy}
              placeholder="e.g. Brand new with tags"
            />
          </Labeled>
          <Labeled label="Original product URL">
            <input
              className={inputClass}
              type="url"
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.target.value)}
              disabled={busy}
              placeholder="https://store.example.com/…"
            />
          </Labeled>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">Campus</span>
            <div className="flex gap-4">
              {CAMPUS_CHOICES.map((name) => (
                <label key={name} className="flex items-center gap-2 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand"
                    checked={campusDraft.includes(name)}
                    onChange={(e) => toggleCampus(name, e.target.checked)}
                    disabled={busy}
                  />
                  {name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Button size="sm" onClick={handleSaveDetails} disabled={busy || !detailsDirty}>
              Save details
            </Button>
          </div>
        </div>
      )}

      <hr className="border-neutral-200" />

      {/* Photos */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-extrabold text-ink">Photos</h3>

        {images.length === 0 && <p className="text-sm text-ink-soft">No photos yet.</p>}

        <div className="flex flex-col gap-2">
          {images.map((src, i) => (
            <div key={src} className="flex items-center gap-3">
              <img
                src={resolveImage(src)}
                alt=""
                className="h-10 w-10 flex-none rounded-lg border border-neutral-200 object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">
                {src.length > 36 ? `…${src.slice(-30)}` : src}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move photo up"
                  disabled={busy || !hasToken || i === 0}
                  onClick={() => handleMove(i, -1)}
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move photo down"
                  disabled={busy || !hasToken || i === images.length - 1}
                  onClick={() => handleMove(i, 1)}
                >
                  <ArrowDown size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove photo"
                  className="text-red-600 hover:bg-red-50"
                  disabled={busy || !hasToken}
                  onClick={() => handleRemovePhoto(src)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {hasToken && (
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div>
              <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
                Upload photo from device
              </Button>
            </div>
            <div className="flex gap-2">
              <input
                className={inputClass}
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="Or paste an image URL…"
                disabled={busy}
              />
              <Button size="md" onClick={handleAddUrl} disabled={busy || !urlDraft.trim()}>
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Status feedback */}
      {status.type === 'busy' && (
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 size={16} className="animate-spin" />
          {status.msg}
        </div>
      )}
      {status.type === 'error' && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 flex-none" />
          <span>{status.msg}</span>
        </div>
      )}
      {status.type === 'done' && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 size={16} className="flex-none" />
          Saved — the site will rebuild in ~1 minute.
        </div>
      )}
    </div>
  );
}
