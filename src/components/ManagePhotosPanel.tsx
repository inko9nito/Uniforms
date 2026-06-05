import { useEffect, useRef, useState } from 'react';
import { Badge, BlockStack, Button, InlineStack, Spinner, Text, TextField } from '@shopify/polaris';
import type { Item } from '../data/inventory';
import { resolveImage } from '../data/inventory';
import {
  addImageToInventoryContent,
  fileToBase64,
  getFile,
  loadToken,
  putFile,
  saveToken,
  setInventoryImages,
  setInventoryQuantity,
  setInventorySize,
  slugify,
} from '../data/github';

interface Props {
  item: Item;
  onPhotosChanged: () => void;
}

type Status = { type: 'idle' } | { type: 'busy'; msg: string } | { type: 'error'; msg: string } | { type: 'done' };

export function ManagePhotosPanel({ item, onPhotosChanged }: Props) {
  const [token, setToken] = useState(loadToken);
  const [tokenDraft, setTokenDraft] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [status, setStatus] = useState<Status>({ type: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);

  // Editable drafts, seeded from the item and re-seeded when a different item opens.
  const [sizeDraft, setSizeDraft] = useState(item.size);
  const [qtyDraft, setQtyDraft] = useState(String(item.quantity));
  // Local image order for responsive reordering before the site rebuilds.
  const [images, setImages] = useState<string[]>(item.images);

  useEffect(() => {
    setSizeDraft(item.size);
    setQtyDraft(String(item.quantity));
    setImages(item.images);
  }, [item]);

  const hasToken = token.length > 0;
  const busy = status.type === 'busy';

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
    const size = sizeDraft.trim();
    const qty = Math.max(0, Math.floor(Number(qtyDraft)));
    if (!Number.isFinite(qty)) {
      setStatus({ type: 'error', msg: 'Quantity must be a number' });
      return;
    }
    try {
      setStatus({ type: 'busy', msg: 'Saving details…' });
      await patchInventory(
        (content) =>
          setInventoryQuantity(setInventorySize(content, item.sourceLine, size), item.sourceLine, qty),
        `Update ${item.displayName}: size ${size}, qty ${qty}`,
      );
      setStatus({ type: 'done' });
      onPhotosChanged();
    } catch (err) {
      setStatus({ type: 'error', msg: (err as Error).message });
    }
  }

  async function commitImage(base64: string, mimeType: string) {
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('gif') ? 'gif' : mimeType.includes('webp') ? 'webp' : 'jpg';
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

    setImages((prev) => [...prev, imagePath]);
    setStatus({ type: 'done' });
    onPhotosChanged();
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
      setImages((prev) => [...prev, url]);
      setUrlDraft('');
      setStatus({ type: 'done' });
      onPhotosChanged();
    } catch (err) {
      setStatus({ type: 'error', msg: (err as Error).message });
    }
  }

  /** Commit a new ordered image list (used for both remove and reorder). */
  async function commitImageOrder(next: string[], message: string) {
    const prev = images;
    setImages(next); // optimistic
    try {
      setStatus({ type: 'busy', msg: 'Saving photos…' });
      await patchInventory((content) => setInventoryImages(content, item.sourceLine, next), message);
      setStatus({ type: 'done' });
      onPhotosChanged();
    } catch (err) {
      setImages(prev); // roll back
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
    [next[index], next[target]] = [next[target], next[index]];
    commitImageOrder(next, `Reorder photos for ${item.displayName}`);
  }

  const detailsDirty = sizeDraft.trim() !== item.size || qtyDraft.trim() !== String(item.quantity);

  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <Text variant="headingSm" as="h3">Edit item</Text>
        {hasToken ? (
          <Button
            variant="plain"
            size="slim"
            onClick={() => { setShowTokenInput((v) => !v); setTokenDraft(''); }}
          >
            {showTokenInput ? 'Cancel' : 'Change token'}
          </Button>
        ) : (
          <Button variant="plain" size="slim" onClick={() => setShowTokenInput(true)}>
            Set up GitHub token
          </Button>
        )}
      </InlineStack>

      {showTokenInput && (
        <BlockStack gap="200">
          <Text as="p" variant="bodySm" tone="subdued">
            Create a{' '}
            <a
              href="https://github.com/settings/tokens/new?description=FCA+Uniform+Resale&scopes=repo"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#2c6ecb' }}
            >
              GitHub personal access token
            </a>{' '}
            with <strong>repo</strong> scope, then paste it here. It is stored only in this browser.
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
        </BlockStack>
      )}

      {/* Size + quantity */}
      {hasToken && (
        <BlockStack gap="200">
          <InlineStack gap="300" wrap={false}>
            <div style={{ flex: 1 }}>
              <TextField
                label="Size"
                value={sizeDraft}
                onChange={setSizeDraft}
                autoComplete="off"
                disabled={busy}
              />
            </div>
            <div style={{ width: 100 }}>
              <TextField
                label="Quantity"
                type="number"
                min={0}
                value={qtyDraft}
                onChange={setQtyDraft}
                autoComplete="off"
                disabled={busy}
              />
            </div>
          </InlineStack>
          <InlineStack>
            <Button onClick={handleSaveDetails} disabled={busy || !detailsDirty} size="slim">
              Save details
            </Button>
          </InlineStack>
        </BlockStack>
      )}

      {/* Photos list with reorder + remove */}
      <BlockStack gap="200">
        <Text variant="headingSm" as="h3">Photos</Text>
        {images.length === 0 && (
          <Text as="p" variant="bodySm" tone="subdued">No photos yet.</Text>
        )}
        {images.map((src, i) => (
          <InlineStack key={src} gap="200" blockAlign="center" wrap={false}>
            <img
              src={resolveImage(src)}
              alt=""
              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid #e3e5e7' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, color: '#6d7175', wordBreak: 'break-all' }}>
                {src.length > 40 ? `…${src.slice(-34)}` : src}
              </span>
            </div>
            <Button
              variant="tertiary"
              size="slim"
              accessibilityLabel="Move photo up"
              disabled={busy || !hasToken || i === 0}
              onClick={() => handleMove(i, -1)}
            >
              ↑
            </Button>
            <Button
              variant="tertiary"
              size="slim"
              accessibilityLabel="Move photo down"
              disabled={busy || !hasToken || i === images.length - 1}
              onClick={() => handleMove(i, 1)}
            >
              ↓
            </Button>
            <Button
              variant="plain"
              tone="critical"
              size="slim"
              disabled={busy || !hasToken}
              onClick={() => handleRemovePhoto(src)}
            >
              Remove
            </Button>
          </InlineStack>
        ))}
      </BlockStack>

      {/* Add controls */}
      {hasToken && (
        <BlockStack gap="200">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <InlineStack gap="200">
            <Button onClick={() => fileRef.current?.click()} disabled={busy} size="slim">
              Upload photo from device
            </Button>
          </InlineStack>

          <TextField
            label=""
            labelHidden
            value={urlDraft}
            onChange={setUrlDraft}
            placeholder="Or paste an image URL…"
            autoComplete="off"
            disabled={busy}
            connectedRight={
              <Button onClick={handleAddUrl} disabled={busy || !urlDraft.trim()} size="slim">
                Add URL
              </Button>
            }
          />
        </BlockStack>
      )}

      {/* Status feedback */}
      {status.type === 'busy' && (
        <InlineStack gap="200" blockAlign="center">
          <Spinner size="small" />
          <Text as="span" variant="bodySm" tone="subdued">{status.msg}</Text>
        </InlineStack>
      )}
      {status.type === 'error' && (
        <InlineStack gap="200" blockAlign="center">
          <Badge tone="critical">Error</Badge>
          <Text as="span" variant="bodySm" tone="critical">{status.msg}</Text>
        </InlineStack>
      )}
      {status.type === 'done' && (
        <Text as="p" variant="bodySm" tone="success">
          Saved — the site will rebuild in ~1 minute.
        </Text>
      )}
    </BlockStack>
  );
}
