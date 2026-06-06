import { useEffect, useRef, useState } from 'react';
import { Badge, BlockStack, Box, Button, Divider, InlineStack, Text } from '@shopify/polaris';
import { isSoldOut, polarisBadgeTone, priceLabel, resolveImage, type Item } from '../data/inventory';
import { GarmentThumbnail } from './GarmentThumbnail';
import { PhotoGallery } from './PhotoGallery';
import { ManagePhotosPanel } from './ManagePhotosPanel';

interface Props {
  item: Item | null;
  onClose: () => void;
  messengerUrl: string;
  manageMode: boolean;
}

function colorFor(name: string): { hex: string; label: string } | null {
  const n = name.toLowerCase();
  if (n.includes('navy')) return { hex: '#26344f', label: 'Navy' };
  if (n.includes('gray') || n.includes('grey')) return { hex: '#a8aeb8', label: 'Gray' };
  if (n.includes('white')) return { hex: '#eef0f3', label: 'White' };
  if (n.includes('khaki')) return { hex: '#ccbb98', label: 'Khaki' };
  if (n.includes('black')) return { hex: '#1a1a1a', label: 'Black' };
  return null;
}

function statusTone(status: string): 'success' | 'attention' | undefined {
  if (status === 'Available') return 'success';
  if (status === 'Reserved') return 'attention';
  return undefined;
}

function conditionTone(condition: string): 'success' | 'attention' | undefined {
  const c = condition.toLowerCase();
  if (c.includes('blemish') || c.includes('fair')) return 'attention';
  if (c) return 'success'; // New with/without tags, Good
  return undefined;
}

export function ItemDetailPanel({ item, onClose, messengerUrl, manageMode }: Props) {
  const open = item !== null;
  const [current, setCurrent] = useState<Item | null>(item);
  const start = useRef<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // On desktop the panel is a right-anchored drawer with a backdrop; on
  // mobile it stays a full-screen slide-over.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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

  // Non-passive listener so we can preventDefault on left-edge touches,
  // which stops Safari from stealing the gesture as a history.back() navigation.
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;
    const block = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t && t.clientX < 28) e.preventDefault();
    };
    el.addEventListener('touchstart', block, { passive: false });
    return () => el.removeEventListener('touchstart', block);
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

  const soldOut = current ? isSoldOut(current) : false;
  const color = current ? colorFor(current.name) : null;
  // Each physical garment in the listing (Sold ones are hidden), shown as its
  // own card — mirrors the "Available items" section in the Airtable interface.
  const visibleInstances = current ? current.instances.filter((i) => i.status !== 'Sold') : [];

  return (
    <>
      {/* Backdrop — desktop drawer only; click to dismiss */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 519,
          background: 'rgba(0,0,0,0.4)',
          opacity: open ? 1 : 0,
          transition: 'opacity 0.32s ease',
          pointerEvents: open ? 'auto' : 'none',
          display: isDesktop ? 'block' : 'none',
        }}
      />

      <div
        ref={panelRef}
        aria-hidden={!open}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: isDesktop ? 'auto' : 0,
          width: isDesktop ? 'min(480px, 100vw)' : 'auto',
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
        {/* Close button fixed to the panel so it doesn't scroll away.
            Chevron (back) on mobile, X (close) on desktop. */}
        <button
          onClick={onClose}
          aria-label={isDesktop ? 'Close' : 'Go back'}
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
            zIndex: 2,
          }}
        >
          {isDesktop ? (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="#303030"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M12 4L6 10L12 16"
                stroke="#303030"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

      {/* Scrollable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingTop: 60 }}
      >
        {current && (
          <>
            {/* Full-bleed image area */}
            <div
              style={{
                position: 'relative',
                height: 'min(48vh, 400px)',
                minHeight: 260,
                background: '#fff',
                flexShrink: 0,
              }}
            >
              {current.images.length > 0 ? (
                <PhotoGallery images={current.images} alt={current.displayName} />
              ) : (
                <GarmentThumbnail item={current} />
              )}
            </div>

            {/* Product info */}
            <Box padding="400">
              <BlockStack gap="300">
                <Text variant="headingXl" as="h1">
                  {current.displayName}
                </Text>

                {/* Price + availability badge inline */}
                <InlineStack gap="300" blockAlign="center">
                  <Text variant="heading2xl" as="p">
                    {priceLabel(current)}
                  </Text>
                  {soldOut ? (
                    <Badge tone="critical">Sold out</Badge>
                  ) : (
                    <Badge tone={polarisBadgeTone(current.badge.tone)}>{current.badge.label}</Badge>
                  )}
                </InlineStack>

                <Divider />

                {/* Properties */}
                <BlockStack gap="300">
                  <InlineStack gap="400" blockAlign="center">
                    <div style={{ width: 80, flexShrink: 0 }}>
                      <Text as="span" tone="subdued">Campus</Text>
                    </div>
                    <InlineStack gap="150">
                      {current.schools.map((s) => (
                        <Badge key={s} tone="info">{s}</Badge>
                      ))}
                    </InlineStack>
                  </InlineStack>
                  {color && (
                    <InlineStack gap="400" blockAlign="center">
                      <div style={{ width: 80, flexShrink: 0 }}>
                        <Text as="span" tone="subdued">Color</Text>
                      </div>
                      <InlineStack gap="200" blockAlign="center">
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: color.hex,
                            border: '1.5px solid rgba(0,0,0,0.14)',
                            flexShrink: 0,
                          }}
                        />
                        <Text as="span">{color.label}</Text>
                      </InlineStack>
                    </InlineStack>
                  )}
                  <InlineStack gap="400" blockAlign="center">
                    <div style={{ width: 80, flexShrink: 0 }}>
                      <Text as="span" tone="subdued">Size</Text>
                    </div>
                    <Text as="span">{current.size}</Text>
                  </InlineStack>
                  {visibleInstances.length === 0 && (
                    <InlineStack gap="400" blockAlign="center">
                      <div style={{ width: 80, flexShrink: 0 }}>
                        <Text as="span" tone="subdued">Condition</Text>
                      </div>
                      {current.note ? (
                        <Text as="span" tone="caution">{current.note}</Text>
                      ) : (
                        <Text as="span">Good</Text>
                      )}
                    </InlineStack>
                  )}
                </BlockStack>

                {visibleInstances.length > 0 && (
                  <>
                    <Divider />
                    <BlockStack gap="300">
                      <Text variant="headingSm" as="h2">
                        {`Available items (${visibleInstances.length})`}
                      </Text>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                          gap: 12,
                        }}
                      >
                        {visibleInstances.map((inst) => (
                          <div
                            key={inst.label}
                            style={{
                              border: '1px solid #e3e5e7',
                              borderRadius: 12,
                              overflow: 'hidden',
                              background: '#fff',
                              display: 'flex',
                              flexDirection: 'column',
                            }}
                          >
                            <div style={{ height: 150, overflow: 'hidden', background: '#f6f6f7' }}>
                              {inst.image ? (
                                <div
                                  style={{
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 8,
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  <img
                                    src={resolveImage(inst.image)}
                                    alt={inst.label}
                                    loading="lazy"
                                    style={{
                                      maxHeight: '100%',
                                      maxWidth: '100%',
                                      objectFit: 'contain',
                                      display: 'block',
                                    }}
                                  />
                                </div>
                              ) : (
                                <GarmentThumbnail item={current} />
                              )}
                            </div>
                            <Box padding="300">
                              <BlockStack gap="150">
                                {inst.price != null && (
                                  <Text variant="headingSm" as="p">{`$${inst.price.toFixed(2)}`}</Text>
                                )}
                                {inst.condition && (
                                  <InlineStack>
                                    <Badge tone={conditionTone(inst.condition)}>
                                      {inst.condition}
                                    </Badge>
                                  </InlineStack>
                                )}
                                {inst.conditionNotes && (
                                  <Text as="span" variant="bodySm" tone="subdued">
                                    {inst.conditionNotes}
                                  </Text>
                                )}
                                <InlineStack>
                                  <Badge tone={statusTone(inst.status)}>{inst.status}</Badge>
                                </InlineStack>
                              </BlockStack>
                            </Box>
                          </div>
                        ))}
                      </div>
                    </BlockStack>
                  </>
                )}

                {current.sourceUrl && (
                  <Button url={current.sourceUrl} target="_blank" variant="plain">
                    View original listing in the store →
                  </Button>
                )}
              </BlockStack>
            </Box>

            {manageMode && (
              <Box padding="400" paddingBlockStart="0">
                <Divider />
                <Box paddingBlockStart="400">
                  <ManagePhotosPanel
                    item={current}
                    onItemPatched={(patch) =>
                      setCurrent((prev) => (prev ? { ...prev, ...patch } : prev))
                    }
                  />
                </Box>
              </Box>
            )}
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
    </>
  );
}
