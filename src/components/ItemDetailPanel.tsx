import { useEffect, useRef, useState } from 'react';
import Heading from '@atlaskit/heading';
import Lozenge from '@atlaskit/lozenge';
import { LinkButton } from '@atlaskit/button/new';
import Modal, { ModalTransition } from '@atlaskit/modal-dialog';
import { Inline, Stack, Text } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import {
  isSoldOut,
  lozengeAppearance,
  priceLabel,
  resolveImage,
  type Instance,
  type Item,
  type LozengeAppearance,
} from '../data/inventory';
import { GarmentThumbnail } from './GarmentThumbnail';
import { PhotoGallery } from './PhotoGallery';
import { ManagePhotosPanel } from './ManagePhotosPanel';

interface Props {
  item: Item | null;
  onClose: () => void;
  messengerUrl: string;
  manageMode: boolean;
}

interface Lightbox {
  images: string[];
  alt: string;
}

function statusAppearance(status: string): LozengeAppearance {
  if (status === 'Available') return 'success';
  if (status === 'Reserved') return 'moved';
  return 'default';
}

function conditionAppearance(condition: string): LozengeAppearance {
  const c = condition.toLowerCase();
  if (c.includes('blemish') || c.includes('fair')) return 'moved';
  if (c) return 'success'; // New with/without tags, Good
  return 'default';
}

/** A single physical-garment card; its photo opens the lightbox when present. */
function InstanceCard({
  inst,
  item,
  onZoom,
}: {
  inst: Instance;
  item: Item;
  onZoom: (lb: Lightbox) => void;
}) {
  const zoomable = !!inst.image;
  return (
    <div
      style={{
        border: `1px solid ${token('color.border', '#e3e5e7')}`,
        borderRadius: 12,
        overflow: 'hidden',
        background: token('elevation.surface', '#fff'),
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <button
        type="button"
        onClick={zoomable ? () => onZoom({ images: [inst.image!], alt: inst.label }) : undefined}
        aria-label={zoomable ? `Enlarge photo of ${inst.label}` : undefined}
        style={{
          height: 150,
          padding: 0,
          border: 'none',
          background: token('elevation.surface.sunken', '#f6f6f7'),
          cursor: zoomable ? 'zoom-in' : 'default',
          overflow: 'hidden',
          display: 'block',
          width: '100%',
        }}
      >
        {inst.image ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, boxSizing: 'border-box' }}>
            <img
              src={resolveImage(inst.image)}
              alt={inst.label}
              loading="lazy"
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
        ) : (
          <GarmentThumbnail item={item} />
        )}
      </button>
      <div style={{ padding: 12 }}>
        <Stack space="space.075">
          {inst.price != null && <Heading size="small" as="span">{`$${inst.price.toFixed(2)}`}</Heading>}
          <Inline space="space.075" shouldWrap>
            {inst.condition && (
              <Lozenge appearance={conditionAppearance(inst.condition)}>{inst.condition}</Lozenge>
            )}
            <Lozenge appearance={statusAppearance(inst.status)}>{inst.status}</Lozenge>
          </Inline>
          {inst.conditionNotes && (
            <Text size="small" color="color.text.subtle">{inst.conditionNotes}</Text>
          )}
        </Stack>
      </div>
    </div>
  );
}

export function ItemDetailPanel({ item, onClose, messengerUrl, manageMode }: Props) {
  const open = item !== null;
  const [current, setCurrent] = useState<Item | null>(item);
  const [lightbox, setLightbox] = useState<Lightbox | null>(null);
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
  // Each physical garment in the listing (Sold ones are hidden), shown as its
  // own card — the photos buyers actually care about.
  const visibleInstances = current ? current.instances.filter((i) => i.status !== 'Sold') : [];
  const hasOfficialPhotos = !!current && current.images.length > 0;

  return (
    <>
      {/* Backdrop — desktop drawer only; click to dismiss */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
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
          zIndex: 210,
          background: token('elevation.surface', '#fff'),
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
              <path d="M5 5L15 15M15 5L5 15" stroke="#303030" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M12 4L6 10L12 16" stroke="#303030" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Scrollable content */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingTop: 56 }}
        >
          {current && (
            <div style={{ padding: 20 }}>
              <Stack space="space.300">
                {/* Header: small, downplayed official photo beside the key facts */}
                <Inline space="space.200" alignBlock="start">
                  <button
                    type="button"
                    onClick={hasOfficialPhotos ? () => setLightbox({ images: current.images, alt: current.displayName }) : undefined}
                    aria-label={hasOfficialPhotos ? 'Enlarge product photo' : undefined}
                    style={{
                      flex: '0 0 auto',
                      width: 104,
                      height: 104,
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: `1px solid ${token('color.border', '#e3e5e7')}`,
                      background: token('elevation.surface.sunken', '#f6f6f7'),
                      padding: 0,
                      cursor: hasOfficialPhotos ? 'zoom-in' : 'default',
                    }}
                  >
                    {hasOfficialPhotos ? (
                      <img
                        src={resolveImage(current.images[0]!)}
                        alt={current.displayName}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', padding: 6, boxSizing: 'border-box' }}
                      />
                    ) : (
                      <GarmentThumbnail item={current} />
                    )}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Stack space="space.100">
                      <Heading size="large" as="h1">{current.displayName}</Heading>
                      <Inline space="space.100" alignBlock="center" shouldWrap>
                        <Heading size="large" as="span">{priceLabel(current)}</Heading>
                        {soldOut ? (
                          <Lozenge appearance="removed">Sold out</Lozenge>
                        ) : (
                          <Lozenge appearance={lozengeAppearance(current.badge.tone)}>{current.badge.label}</Lozenge>
                        )}
                      </Inline>
                      <Inline space="space.050" alignBlock="center">
                        <Text size="small" color="color.text.subtlest">Size</Text>
                        <Text size="small">{current.size}</Text>
                      </Inline>
                      <Inline space="space.050" alignBlock="center" shouldWrap>
                        <Text size="small" color="color.text.subtlest">Campus</Text>
                        {current.schools.map((s) => (
                          <Lozenge key={s}>{s}</Lozenge>
                        ))}
                      </Inline>
                    </Stack>
                  </div>
                </Inline>

                {current.sourceUrl && (
                  <a
                    href={current.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: token('color.link', '#0c66e4'), fontSize: 13, textDecoration: 'none', alignSelf: 'flex-start' }}
                  >
                    View original store listing ↗
                  </a>
                )}

                {visibleInstances.length > 0 && (
                  <Stack space="space.200">
                    <Heading size="small" as="h2">{`Available items (${visibleInstances.length})`}</Heading>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                        gap: 12,
                      }}
                    >
                      {visibleInstances.map((inst) => (
                        <InstanceCard key={inst.label} inst={inst} item={current} onZoom={setLightbox} />
                      ))}
                    </div>
                  </Stack>
                )}

                {manageMode && (
                  <div style={{ borderTop: `1px solid ${token('color.border', '#e3e5e7')}`, paddingTop: 16 }}>
                    <ManagePhotosPanel
                      item={current}
                      onItemPatched={(patch) =>
                        setCurrent((prev) => (prev ? { ...prev, ...patch } : prev))
                      }
                    />
                  </div>
                )}
              </Stack>
            </div>
          )}
        </div>

        {/* Sticky CTA pinned to bottom */}
        {current && (
          <div
            style={{
              flex: '0 0 auto',
              padding: '12px 16px 20px',
              borderTop: `1px solid ${token('color.border', '#e3e5e7')}`,
              background: token('elevation.surface', '#fff'),
            }}
          >
            <LinkButton appearance="primary" href={messengerUrl} target="_blank" shouldFitContainer>
              Message me on Facebook to buy
            </LinkButton>
          </div>
        )}
      </div>

      {/* Photo lightbox */}
      <ModalTransition>
        {lightbox && (
          <Modal onClose={() => setLightbox(null)} width="large">
            <div style={{ height: 'min(72vh, 640px)', background: token('elevation.surface', '#fff') }}>
              {lightbox.images.length > 1 ? (
                <PhotoGallery images={lightbox.images} alt={lightbox.alt} />
              ) : (
                <img
                  src={resolveImage(lightbox.images[0]!)}
                  alt={lightbox.alt}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              )}
            </div>
          </Modal>
        )}
      </ModalTransition>
    </>
  );
}
