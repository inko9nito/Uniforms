import { useEffect, useRef, useState } from 'react';
import { Badge, BlockStack, Box, Button, Divider, InlineStack, Text } from '@shopify/polaris';
import type { Item } from '../data/inventory';
import { GarmentThumbnail } from './GarmentThumbnail';
import { PhotoGallery } from './PhotoGallery';

interface Props {
  item: Item | null;
  onClose: () => void;
  messengerUrl: string;
}

export function ItemDetailPanel({ item, onClose, messengerUrl }: Props) {
  const open = item !== null;
  const [current, setCurrent] = useState<Item | null>(item);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (item) setCurrent(item);
  }, [item]);

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
      {/* Scrollable content — no header bar; back button floats over image */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        {current && (
          <>
            {/* Full-bleed image area */}
            <div
              style={{
                position: 'relative',
                height: 'min(48vh, 400px)',
                minHeight: 260,
                background: '#f6f6f7',
                flexShrink: 0,
              }}
            >
              {current.images.length > 0 ? (
                <PhotoGallery images={current.images} alt={current.displayName} />
              ) : (
                <GarmentThumbnail item={current} />
              )}

              {/* Floating back button overlaid on image */}
              <button
                onClick={onClose}
                aria-label="Go back"
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.92)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.18)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 1,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M12 4L6 10L12 16"
                    stroke="#303030"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Product info */}
            <Box padding="400">
              <BlockStack gap="300">
                <Text variant="headingXl" as="h1">
                  {current.displayName}
                </Text>

                <Text variant="heading2xl" as="p">
                  {`$${current.unitPrice}`}
                </Text>

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

                <Divider />

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
                  <Button url={current.sourceUrl} target="_blank" variant="plain">
                    View original listing in the store →
                  </Button>
                )}
              </BlockStack>
            </Box>
          </>
        )}
      </div>

      {/* Sticky CTA pinned to bottom */}
      {current && (
        <div
          style={{
            flex: '0 0 auto',
            padding: '12px 16px 20px',
            borderTop: '1px solid #e3e5e7',
            background: '#fff',
          }}
        >
          <Button url={messengerUrl} target="_blank" variant="primary" fullWidth size="large">
            Message me on Facebook to buy
          </Button>
        </div>
      )}
    </div>
  );
}
