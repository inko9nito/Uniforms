import { useEffect, useRef, useState } from 'react';
import {
  Banner,
  BlockStack,
  Button,
  ChoiceList,
  Divider,
  FormLayout,
  InlineStack,
  Link,
  Select,
  Spinner,
  Text,
  TextField,
  Thumbnail,
} from '@shopify/polaris';
import { ArrowDownIcon, ArrowUpIcon, DeleteIcon } from '@shopify/polaris-icons';
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

const GENDER_OPTIONS = ['Girls', 'Boys', 'Unisex'];
const CAMPUS_CHOICES: { label: SchoolName; value: SchoolName }[] = [
  { label: 'Carrollton', value: 'Carrollton' },
  { label: 'Frisco', value: 'Frisco' },
];

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
  const genderOptions = GENDER_OPTIONS.includes(item.section)
    ? GENDER_OPTIONS
    : [item.section, ...GENDER_OPTIONS];

  function handleSaveToken() {
    const t = tokenDraft.trim();
    saveToken(t);
    setToken(t);
    setTokenDraft('');
    setShowTokenInput(false);
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
    [next[index], next[target]] = [next[target], next[index]];
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
    <BlockStack gap="400">
      {/* Token setup */}
      {!hasToken && !showTokenInput && (
        <Banner tone="warning">
          <BlockStack gap="200">
            <Text as="p" variant="bodySm">
              A GitHub token is required to save changes.
            </Text>
            <InlineStack>
              <Button size="slim" onClick={() => setShowTokenInput(true)}>
                Set up token
              </Button>
            </InlineStack>
          </BlockStack>
        </Banner>
      )}

      {showTokenInput && (
        <BlockStack gap="200">
          <Text as="p" variant="bodySm" tone="subdued">
            Create a{' '}
            <Link
              url="https://github.com/settings/tokens/new?description=FCA+Uniform+Resale&scopes=repo"
              target="_blank"
            >
              GitHub personal access token
            </Link>{' '}
            with <strong>repo</strong> scope. Stored only in this browser.
          </Text>
          <TextField
            label="GitHub token"
            value={tokenDraft}
            onChange={setTokenDraft}
            type="password"
            autoComplete="off"
            placeholder="ghp_…"
            connectedRight={
              <Button onClick={handleSaveToken} disabled={!tokenDraft.trim()}>
                Save
              </Button>
            }
          />
          <InlineStack>
            <Button
              variant="plain"
              size="slim"
              onClick={() => {
                setShowTokenInput(false);
                setTokenDraft('');
              }}
            >
              Cancel
            </Button>
          </InlineStack>
        </BlockStack>
      )}

      {hasToken && !showTokenInput && (
        <InlineStack align="end">
          <Button
            variant="plain"
            size="slim"
            onClick={() => {
              setShowTokenInput(true);
              setTokenDraft('');
            }}
          >
            Change token
          </Button>
        </InlineStack>
      )}

      {/* Details: title, gender, campus, size, condition, price, qty */}
      {hasToken && (
        <BlockStack gap="300">
          <FormLayout>
            <TextField
              label="Title"
              value={titleDraft}
              onChange={setTitleDraft}
              autoComplete="off"
              disabled={busy}
            />
            <FormLayout.Group>
              <Select
                label="Gender"
                options={genderOptions}
                value={genderDraft}
                onChange={setGenderDraft}
                disabled={busy}
              />
              <TextField
                label="Size"
                value={sizeDraft}
                onChange={setSizeDraft}
                autoComplete="off"
                disabled={busy}
              />
            </FormLayout.Group>
            <FormLayout.Group>
              <TextField
                label="Price"
                type="number"
                min={0}
                prefix="$"
                value={priceDraft}
                onChange={setPriceDraft}
                autoComplete="off"
                disabled={busy}
              />
              <TextField
                label="Qty"
                type="number"
                min={0}
                value={qtyDraft}
                onChange={setQtyDraft}
                autoComplete="off"
                disabled={busy}
              />
            </FormLayout.Group>
            <TextField
              label="Condition"
              value={conditionDraft}
              onChange={setConditionDraft}
              autoComplete="off"
              disabled={busy}
              placeholder="e.g. Brand new with tags"
            />
            <TextField
              label="Original product URL"
              type="url"
              value={linkDraft}
              onChange={setLinkDraft}
              autoComplete="off"
              disabled={busy}
              placeholder="https://store.example.com/…"
              helpText="Link to the original store listing (optional)"
            />
            <ChoiceList
              allowMultiple
              title="Campus"
              choices={CAMPUS_CHOICES}
              selected={campusDraft}
              onChange={setCampusDraft}
              disabled={busy}
            />
          </FormLayout>
          <InlineStack>
            <Button onClick={handleSaveDetails} disabled={busy || !detailsDirty} size="slim">
              Save details
            </Button>
          </InlineStack>
        </BlockStack>
      )}

      <Divider />

      {/* Photos */}
      <BlockStack gap="300">
        <Text variant="headingSm" as="h3">
          Photos
        </Text>

        {images.length === 0 && (
          <Text as="p" variant="bodySm" tone="subdued">
            No photos yet.
          </Text>
        )}

        <BlockStack gap="200">
          {images.map((src, i) => (
            <InlineStack key={src} gap="300" blockAlign="center" wrap={false}>
              <Thumbnail source={resolveImage(src)} alt="" size="small" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text as="span" variant="bodySm" tone="subdued" breakWord>
                  {src.length > 36 ? `…${src.slice(-30)}` : src}
                </Text>
              </div>
              <InlineStack gap="050" wrap={false}>
                <Button
                  icon={ArrowUpIcon}
                  variant="tertiary"
                  size="slim"
                  accessibilityLabel="Move photo up"
                  disabled={busy || !hasToken || i === 0}
                  onClick={() => handleMove(i, -1)}
                />
                <Button
                  icon={ArrowDownIcon}
                  variant="tertiary"
                  size="slim"
                  accessibilityLabel="Move photo down"
                  disabled={busy || !hasToken || i === images.length - 1}
                  onClick={() => handleMove(i, 1)}
                />
                <Button
                  icon={DeleteIcon}
                  variant="tertiary"
                  tone="critical"
                  size="slim"
                  accessibilityLabel="Remove photo"
                  disabled={busy || !hasToken}
                  onClick={() => handleRemovePhoto(src)}
                />
              </InlineStack>
            </InlineStack>
          ))}
        </BlockStack>

        {hasToken && (
          <BlockStack gap="200">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <InlineStack>
              <Button onClick={() => fileRef.current?.click()} disabled={busy} size="slim">
                Upload photo from device
              </Button>
            </InlineStack>
            <TextField
              label="Add from URL"
              labelHidden
              value={urlDraft}
              onChange={setUrlDraft}
              placeholder="Or paste an image URL…"
              autoComplete="off"
              disabled={busy}
              connectedRight={
                <Button onClick={handleAddUrl} disabled={busy || !urlDraft.trim()}>
                  Add
                </Button>
              }
            />
          </BlockStack>
        )}
      </BlockStack>

      {/* Status feedback */}
      {status.type === 'busy' && (
        <InlineStack gap="200" blockAlign="center">
          <Spinner size="small" />
          <Text as="span" variant="bodySm" tone="subdued">
            {status.msg}
          </Text>
        </InlineStack>
      )}
      {status.type === 'error' && (
        <Banner tone="critical" onDismiss={() => setStatus({ type: 'idle' })}>
          <Text as="p" variant="bodySm">
            {status.msg}
          </Text>
        </Banner>
      )}
      {status.type === 'done' && (
        <Banner tone="success" onDismiss={() => setStatus({ type: 'idle' })}>
          <Text as="p" variant="bodySm">
            Saved — the site will rebuild in ~1 minute.
          </Text>
        </Banner>
      )}
    </BlockStack>
  );
}
