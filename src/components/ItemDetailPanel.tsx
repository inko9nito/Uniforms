import { useEffect, useRef, useState } from 'react';
import { Badge, BlockStack, Box, Button, InlineStack, Text } from '@shopify/polaris';
import type { Item } from '../data/inventory';
import { GarmentThumbnail } from './GarmentThumbnail';
import { PhotoGallery } from './PhotoGallery';

interface Props {
  item: Item | null;
  onClose: () => void;
  messengerUrl: string;
}

/**
 * Full-screen detail view that slides in from the right (iOS push style).
 * Stays mounted so it can animate both in and out; the last item is kept
 * on screen during the close animation.
 */
export function ItemDetailPanel({ item, onClose, messengerUrl }: Props) {
  const open = item !== null;
  const [current, setCurrent] = useState<Item | null>(item);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (item) setCurrent(item);
  }, [item]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) start.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const s = start.current;
    const t = e.changedTouches[0];
    start.current = null;
    if (!s || !t) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    // Edge-swipe right = iOS back.
    if (s.x < 28 && dx > 70 && Math.abs(dy) < 50) onClose();
  };

  const soldOut = current ? current.quantity <= 0 : false;

  return (
    <div
      aria-hidden={!open}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 520,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
        boxShadow: open ? '-8px 0 24px rgba(0,0,0,0.12)' : 'none',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 8px 8px 4px',
          borderBottom: '1px solid #e3e5e7',
          minHeight: 52,
        }}
      >
        <button
          onClick={onClose}
          aria-label="Go back"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            color: '#303030',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span
          style={{
            fontWeight: 650,
            fontSize: 16,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {current?.displayName}
        </span>
      </div>

      {/* Scrollable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        {current && (
          <Box padding="400">
            <BlockStack gap="400">
              {current.images.length > 0 ? (
                <PhotoGallery images={current.images} alt={current.displayName} />
              ) : (
                <div style={{ height: 320, borderRadius: 8, overflow: 'hidden' }}>
                  <GarmentThumbnail item={current} />
                </div>
              )}

              <InlineStack gap="200" blockAlign="center">
                {soldOut ? (
                  <Badge tone="critical">Sold out</Badge>
                ) : (
                  <Badge tone="success">{`${current.quantity} available`}</Badge>
                )}
                {current.schools.map((s) => (
                  <Badge key={s} tone="info">
                    {s}
                  </Badge>
                ))}
              </InlineStack>

              <Text variant="headingLg" as="p">
                {`$${current.unitPrice}`}
              </Text>

              <BlockStack gap="100">
                <Text as="p" tone="subdued">
                  {`Size ${current.size}`}
                </Text>
                {current.note && (
                  <Text as="p" tone="caution">
                    {current.note}
                  </Text>
                )}
              </BlockStack>

              {current.sourceUrl && (
                <Box>
                  <Button url={current.sourceUrl} target="_blank" variant="plain">
                    View original listing in the store →
                  </Button>
                </Box>
              )}

              <Box paddingBlockStart="200">
                <Button url={messengerUrl} target="_blank" variant="primary" fullWidth>
                  Message me on Facebook to buy
                </Button>
              </Box>
            </BlockStack>
          </Box>
        )}
      </div>
    </div>
  );
}
