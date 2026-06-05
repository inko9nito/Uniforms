import { useEffect, useRef, useState } from 'react';
import {
  Banner,
  BlockStack,
  Button,
  Divider,
  FormLayout,
  InlineStack,
  Link,
  Spinner,
  Text,
  TextField,
  Thumbnail,
} from '@shopify/polaris';
import { ArrowDownIcon, ArrowUpIcon, DeleteIcon } from '@shopify/polaris-icons';
import type { Item } from '../data/inventory';
import { resolveImage } from '../data/inventory';
import {
  addImageToInventoryContent,
  fileToBase64,
  getFile,
  loadToken,
  putFile,
  saveToken,
  setInventoryCondition,
  setInventoryImages,
  setInventoryQuantity,
  setInventorySize,
  slugify,
} from '../data/github';

interface Props {
  item: Item;
  onPhotosChanged: () => void;
}

type Status =
  | { type: 'idle' }
  | { type: 'busy'; msg: string }
  | { type: 'error'; msg: string }
  | { type: 'done' };

export function ManagePhotosPanel({ item, onPhotosChanged }: Props) {
  const [token, setToken] = useState(loadToken);
  const [tokenDraft, setTokenDraft] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [status, setStatus] = useState<Status>({ type: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);

  const [sizeDraft, setSizeDraft] = useState(item.size);
  const [conditionDraft, setConditionDraft] = useState(item.note ?? '');
  const [qtyDraft, setQtyDraft] = useState(String(item.quantity));
  const [images, setImages] = useState<string[]>(item.images);

  useEffect(() => {
    setSizeDraft(item.size);
    setConditionDraft(item.note ?? '');
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

  async function patchInventory(transform: (content: string) => string, message: string) {
    const { content, sha } = await getFile(token, 'inventory.md');
    const updated = transform(content);
    await putFile(token, 'inventory.md', btoa(unescape(encodeURIComponent(updated))), sha, message);
  }

  async function handleSaveDetails() {
    const size = sizeDraft.trim();
    const condition = conditionDraft.trim();
    const qty = Math.max(0, Math.floor(Number(qtyDraft)));
    if (!Number.isFinite(qty)) {
      setStatus({ type: 'error', msg: 'Quantity must be a number' });
      return;
    }
    try {
      setStatus({ type: 'busy', msg: 'Saving details…' });
      await patchInventory(
        (content) =>
          setInventoryQuantity(
            setInventoryCondition(
              setInventorySize(content, item.sourceLine, size),
              item.sourceLine,
              condition,
            ),
            item.sourceLine,
            qty,
          ),
        `Update ${item.displayName}: details`,
      );
      setStatus({ type: 'done' });
      onPhotosChanged();
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

  async function commitImageOrder(next: string[], message: string) {
    const prev = images;
    setImages(next);
    try {
      setStatus({ type: 'busy', msg: 'Saving photos…' });
      await patchInventory(
        (content) => setInventoryImages(content, item.sourceLine, next),
        message,
      );
      setStatus({ type: 'done' });
      onPhotosChanged();
    } catch (err) {
      setImages(prev);
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
    sizeDraft.trim() !== item.size ||
    conditionDraft.trim() !== (item.note ?? '') ||
    qtyDraft.trim() !== String(item.quantity);

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

      {/* Details: size, condition, quantity */}
      {hasToken && (
        <BlockStack gap="300">
          <FormLayout>
            <FormLayout.Group>
              <TextField
                label="Size"
                value={sizeDraft}
                onChange={setSizeDraft}
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
