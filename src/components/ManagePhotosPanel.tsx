import { useRef, useState } from 'react';
import { Badge, BlockStack, Button, InlineStack, Spinner, Text, TextField } from '@shopify/polaris';
import type { Item } from '../data/inventory';
import { resolveImage } from '../data/inventory';
import {
  addImageToInventoryContent,
  fileToBase64,
  getFile,
  loadToken,
  putFile,
  removeImageFromInventoryContent,
  saveToken,
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

  const hasToken = token.length > 0;

  function handleSaveToken() {
    const t = tokenDraft.trim();
    saveToken(t);
    setToken(t);
    setTokenDraft('');
    setShowTokenInput(false);
  }

  async function commitImage(base64: string, _filename: string, mimeType: string) {
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('gif') ? 'gif' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const safeName = `${slugify(item.name)}-${Date.now()}.${ext}`;
    const imagePath = `images/${safeName}`;
    const repoPath = `public/images/${safeName}`;

    setStatus({ type: 'busy', msg: 'Uploading photo…' });

    // Upload image file
    await putFile(token, repoPath, base64, null, `Add photo for ${item.displayName}`);

    setStatus({ type: 'busy', msg: 'Updating inventory…' });

    // Read current inventory.md and patch the row
    const { content, sha } = await getFile(token, 'inventory.md');
    const updated = addImageToInventoryContent(content, item.sourceLine, imagePath);
    await putFile(
      token,
      'inventory.md',
      btoa(unescape(encodeURIComponent(updated))),
      sha,
      `Add photo to ${item.displayName}`,
    );

    setStatus({ type: 'done' });
    onPhotosChanged();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      await commitImage(base64, file.name, file.type);
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
      setStatus({ type: 'busy', msg: 'Fetching image…' });
      // For external URLs, add directly as a URL reference (no re-hosting needed)
      const { content, sha } = await getFile(token, 'inventory.md');
      const updated = addImageToInventoryContent(content, item.sourceLine, url);
      setStatus({ type: 'busy', msg: 'Updating inventory…' });
      await putFile(
        token,
        'inventory.md',
        btoa(unescape(encodeURIComponent(updated))),
        sha,
        `Add photo URL to ${item.displayName}`,
      );
      setUrlDraft('');
      setStatus({ type: 'done' });
      onPhotosChanged();
    } catch (err) {
      setStatus({ type: 'error', msg: (err as Error).message });
    }
  }

  async function handleRemovePhoto(imagePath: string) {
    if (!hasToken) return;
    try {
      setStatus({ type: 'busy', msg: 'Removing photo…' });
      const { content, sha } = await getFile(token, 'inventory.md');
      const updated = removeImageFromInventoryContent(content, item.sourceLine, imagePath);
      await putFile(
        token,
        'inventory.md',
        btoa(unescape(encodeURIComponent(updated))),
        sha,
        `Remove photo from ${item.displayName}`,
      );
      setStatus({ type: 'done' });
      onPhotosChanged();
    } catch (err) {
      setStatus({ type: 'error', msg: (err as Error).message });
    }
  }

  const busy = status.type === 'busy';

  return (
    <BlockStack gap="300">
      <InlineStack align="space-between" blockAlign="center">
        <Text variant="headingSm" as="h3">Photos</Text>
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

      {/* Current photos list */}
      {item.images.length > 0 && (
        <BlockStack gap="200">
          {item.images.map((src) => (
            <InlineStack key={src} gap="200" blockAlign="center" wrap={false}>
              <img
                src={resolveImage(src)}
                alt=""
                style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid #e3e5e7' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: '#6d7175', wordBreak: 'break-all' }}>
                  {src.length > 50 ? `…${src.slice(-44)}` : src}
                </span>
              </div>
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
      )}

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
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              size="slim"
            >
              Upload photo from device
            </Button>
          </InlineStack>

          <InlineStack gap="200" blockAlign="center" wrap={false}>
            <div style={{ flex: 1 }}>
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
            </div>
          </InlineStack>
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
