import { useEffect, useRef, useState } from 'react';
import Heading from '@atlaskit/heading';
import Button, { IconButton } from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import { Checkbox } from '@atlaskit/checkbox';
import SectionMessage from '@atlaskit/section-message';
import Spinner from '@atlaskit/spinner';
import ArrowUpIcon from '@atlaskit/icon/core/arrow-up';
import ArrowDownIcon from '@atlaskit/icon/core/arrow-down';
import TrashIcon from '@atlaskit/icon/core/delete';
import { Inline, Stack, Text } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import type { Item, SchoolName } from '../data/inventory';
import { resolveImage } from '../data/inventory';
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

interface GenderOption {
  label: string;
  value: string;
}

const GENDER_OPTIONS = ['Girls', 'Boys', 'Unisex'];
const CAMPUS_CHOICES: SchoolName[] = ['Carrollton', 'Frisco'];

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

/** A label stacked above its control (Atlaskit Field needs a Form ancestor; this doesn't). */
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack space="space.050">
      <Text size="small" weight="medium">{label}</Text>
      {children}
    </Stack>
  );
}

export function ManagePhotosPanel({ item, onItemPatched }: Props) {
  const [token_, setToken] = useState(loadToken);
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

  const hasToken = token_.length > 0;
  const busy = status.type === 'busy';

  // Gender options always include the item's current section, even if it's
  // something custom (e.g. "Other") that isn't in the standard list.
  const genderNames = GENDER_OPTIONS.includes(item.section)
    ? GENDER_OPTIONS
    : [item.section, ...GENDER_OPTIONS];
  const genderOptions: GenderOption[] = genderNames.map((g) => ({ label: g, value: g }));

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
    const { content, sha } = await getFile(token_, 'inventory.md');
    const updated = transform(content);
    await putFile(token_, 'inventory.md', btoa(unescape(encodeURIComponent(updated))), sha, message);
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
    await putFile(token_, repoPath, base64, null, `Add photo for ${item.displayName}`);

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
      await patchInventory(
        (content) => setInventoryImages(content, item.sourceLine, next),
        message,
      );
      setStatus({ type: 'done' });
    } catch (err) {
      setImages(prev);
      onItemPatched({ images: prev }); // roll back
      setStatus({ type: 'error', msg: (err as Error).message });
    }
  }

  function handleRemovePhoto(src: string) {
    if (!hasToken) return;
    commitImageOrder(
      images.filter((s) => s !== src),
      `Remove photo from ${item.displayName}`,
    );
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
    <Stack space="space.300">
      {/* Token setup */}
      {!hasToken && !showTokenInput && (
        <SectionMessage appearance="warning">
          <Stack space="space.150">
            <Text size="small">A GitHub token is required to save changes.</Text>
            <div>
              <Button spacing="compact" onClick={() => setShowTokenInput(true)}>
                Set up token
              </Button>
            </div>
          </Stack>
        </SectionMessage>
      )}

      {showTokenInput && (
        <Stack space="space.100">
          <Text size="small" color="color.text.subtle">
            Create a{' '}
            <a
              href="https://github.com/settings/tokens/new?description=FCA+Uniform+Resale&scopes=repo"
              target="_blank"
              rel="noreferrer"
              style={{ color: token('color.link', '#0c66e4') }}
            >
              GitHub personal access token
            </a>{' '}
            with <strong>repo</strong> scope. Stored only in this browser.
          </Text>
          <Textfield
            value={tokenDraft}
            onChange={(e) => setTokenDraft(e.currentTarget.value)}
            type="password"
            placeholder="ghp_…"
            elemAfterInput={
              <div style={{ padding: 2 }}>
                <Button spacing="compact" onClick={handleSaveToken} isDisabled={!tokenDraft.trim()}>
                  Save
                </Button>
              </div>
            }
          />
          <div>
            <Button
              appearance="subtle"
              spacing="compact"
              onClick={() => {
                setShowTokenInput(false);
                setTokenDraft('');
              }}
            >
              Cancel
            </Button>
          </div>
        </Stack>
      )}

      {hasToken && !showTokenInput && (
        <Inline spread="space-between">
          <span />
          <Button
            appearance="subtle"
            spacing="compact"
            onClick={() => {
              setShowTokenInput(true);
              setTokenDraft('');
            }}
          >
            Change token
          </Button>
        </Inline>
      )}

      {/* Details: title, gender, campus, size, condition, price, qty */}
      {hasToken && (
        <Stack space="space.200">
          <Labeled label="Title">
            <Textfield value={titleDraft} onChange={(e) => setTitleDraft(e.currentTarget.value)} isDisabled={busy} />
          </Labeled>
          <Inline space="space.200" grow="fill">
            <div style={{ flex: 1 }}>
              <Labeled label="Gender">
                <Select<GenderOption>
                  inputId="gender-select"
                  options={genderOptions}
                  value={genderOptions.find((o) => o.value === genderDraft) ?? null}
                  onChange={(opt) => opt && setGenderDraft(opt.value)}
                  isDisabled={busy}
                  isSearchable={false}
                />
              </Labeled>
            </div>
            <div style={{ flex: 1 }}>
              <Labeled label="Size">
                <Textfield value={sizeDraft} onChange={(e) => setSizeDraft(e.currentTarget.value)} isDisabled={busy} />
              </Labeled>
            </div>
          </Inline>
          <Inline space="space.200" grow="fill">
            <div style={{ flex: 1 }}>
              <Labeled label="Price">
                <Textfield
                  type="number"
                  min={0}
                  elemBeforeInput={<span style={{ paddingLeft: 6 }}>$</span>}
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.currentTarget.value)}
                  isDisabled={busy}
                />
              </Labeled>
            </div>
            <div style={{ flex: 1 }}>
              <Labeled label="Qty">
                <Textfield
                  type="number"
                  min={0}
                  value={qtyDraft}
                  onChange={(e) => setQtyDraft(e.currentTarget.value)}
                  isDisabled={busy}
                />
              </Labeled>
            </div>
          </Inline>
          <Labeled label="Condition">
            <Textfield
              value={conditionDraft}
              onChange={(e) => setConditionDraft(e.currentTarget.value)}
              isDisabled={busy}
              placeholder="e.g. Brand new with tags"
            />
          </Labeled>
          <Labeled label="Original product URL">
            <Textfield
              type="url"
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.currentTarget.value)}
              isDisabled={busy}
              placeholder="https://store.example.com/…"
            />
          </Labeled>
          <Stack space="space.050">
            <Text size="small" weight="medium">Campus</Text>
            {CAMPUS_CHOICES.map((name) => (
              <Checkbox
                key={name}
                label={name}
                isChecked={campusDraft.includes(name)}
                onChange={(e) => toggleCampus(name, e.currentTarget.checked)}
                isDisabled={busy}
              />
            ))}
          </Stack>
          <div>
            <Button onClick={handleSaveDetails} isDisabled={busy || !detailsDirty} spacing="compact">
              Save details
            </Button>
          </div>
        </Stack>
      )}

      <div style={{ borderTop: `1px solid ${token('color.border', '#e3e5e7')}` }} />

      {/* Photos */}
      <Stack space="space.200">
        <Heading size="small" as="h3">Photos</Heading>

        {images.length === 0 && (
          <Text size="small" color="color.text.subtle">No photos yet.</Text>
        )}

        <Stack space="space.100">
          {images.map((src, i) => (
            <Inline key={src} space="space.150" alignBlock="center">
              <img
                src={resolveImage(src)}
                alt=""
                style={{
                  width: 40,
                  height: 40,
                  objectFit: 'cover',
                  borderRadius: 4,
                  border: `1px solid ${token('color.border', '#e3e5e7')}`,
                  flex: '0 0 auto',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="small" color="color.text.subtle">
                  {src.length > 36 ? `…${src.slice(-30)}` : src}
                </Text>
              </div>
              <Inline space="space.050">
                <IconButton
                  icon={ArrowUpIcon}
                  label="Move photo up"
                  appearance="subtle"
                  spacing="compact"
                  isDisabled={busy || !hasToken || i === 0}
                  onClick={() => handleMove(i, -1)}
                />
                <IconButton
                  icon={ArrowDownIcon}
                  label="Move photo down"
                  appearance="subtle"
                  spacing="compact"
                  isDisabled={busy || !hasToken || i === images.length - 1}
                  onClick={() => handleMove(i, 1)}
                />
                <IconButton
                  icon={TrashIcon}
                  label="Remove photo"
                  appearance="subtle"
                  spacing="compact"
                  isDisabled={busy || !hasToken}
                  onClick={() => handleRemovePhoto(src)}
                />
              </Inline>
            </Inline>
          ))}
        </Stack>

        {hasToken && (
          <Stack space="space.100">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div>
              <Button onClick={() => fileRef.current?.click()} isDisabled={busy} spacing="compact">
                Upload photo from device
              </Button>
            </div>
            <Textfield
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.currentTarget.value)}
              placeholder="Or paste an image URL…"
              isDisabled={busy}
              elemAfterInput={
                <div style={{ padding: 2 }}>
                  <Button spacing="compact" onClick={handleAddUrl} isDisabled={busy || !urlDraft.trim()}>
                    Add
                  </Button>
                </div>
              }
            />
          </Stack>
        )}
      </Stack>

      {/* Status feedback */}
      {status.type === 'busy' && (
        <Inline space="space.100" alignBlock="center">
          <Spinner size="small" />
          <Text size="small" color="color.text.subtle">{status.msg}</Text>
        </Inline>
      )}
      {status.type === 'error' && (
        <SectionMessage appearance="error">
          <Text size="small">{status.msg}</Text>
        </SectionMessage>
      )}
      {status.type === 'done' && (
        <SectionMessage appearance="success">
          <Text size="small">Saved — the site will rebuild in ~1 minute.</Text>
        </SectionMessage>
      )}
    </Stack>
  );
}
