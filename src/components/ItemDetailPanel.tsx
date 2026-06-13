import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ExternalLink, ImageOff, X, ZoomIn } from 'lucide-react';
import { Badge } from './ui/badge';
import { Dialog, DialogContent } from './ui/dialog';
import {
  resolveImage,
  storeName,
  type BadgeVariant,
  type Instance,
  type Item,
} from '../data/inventory';
import { GarmentThumbnail } from './GarmentThumbnail';
import { PhotoGallery } from './PhotoGallery';
import { cn } from '../lib/utils';

interface Props {
  item: Item | null;
  onClose: () => void;
}

interface Lightbox {
  images: string[];
  alt: string;
}

function statusVariant(status: string): BadgeVariant {
  if (status === 'Available') return 'success';
  if (status === 'Reserved') return 'warning';
  return 'neutral';
}

/**
 * A single physical garment, styled like the main grid cards: photo in a
 * rounded white tile, text in the negative space below. Tapping the photo
 * opens the lightbox when there is one.
 */
function InstanceCard({
  inst,
  onZoom,
}: {
  inst: Instance;
  onZoom: (lb: Lightbox) => void;
}) {
  const zoomable = !!inst.image;
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={zoomable ? () => onZoom({ images: [inst.image!], alt: inst.label }) : undefined}
        aria-label={zoomable ? `Enlarge photo of ${inst.label}` : undefined}
        className={cn(
          'group relative block aspect-square w-full overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_2px_8px_-2px_rgba(15,16,26,0.06),0_12px_28px_-18px_rgba(15,16,26,0.20)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          zoomable ? 'cursor-zoom-in' : 'cursor-default',
        )}
      >
        {inst.image ? (
          <>
            <img
              src={resolveImage(inst.image)}
              alt={inst.label}
              loading="lazy"
              className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/85 text-ink opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              <ZoomIn size={15} />
            </span>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-ink-soft">
            <ImageOff size={26} className="opacity-40" />
            <span className="text-[11px] font-medium">Photo coming soon</span>
          </div>
        )}
      </button>

      {/* Text in the negative space below the tile */}
      <div className="mt-2 overflow-hidden px-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] leading-snug text-ink-soft">
            {inst.condition || ' '}
          </span>
          <Badge variant={statusVariant(inst.status)} className="flex-none px-2 py-0.5 text-[10px]">
            {inst.status}
          </Badge>
        </div>
        {inst.conditionNotes && (
          <p className="mt-0.5 truncate text-[11px] leading-snug text-ink-soft" title={inst.conditionNotes}>
            {inst.conditionNotes}
          </p>
        )}
        {inst.price != null && (
          <p className="mt-1 text-[14px] font-bold text-ink">{`$${inst.price.toFixed(2)}`}</p>
        )}
      </div>
    </div>
  );
}

export function ItemDetailPanel({ item, onClose }: Props) {
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

  // Each physical garment in the listing (Sold ones are hidden), shown as its
  // own card — the photos buyers actually care about.
  const visibleInstances = current ? current.instances.filter((i) => i.status !== 'Sold') : [];
  const hasOfficialPhotos = !!current && current.images.length > 0;
  const store = current?.sourceUrl ? storeName(current.sourceUrl) : null;

  return (
    <>
      {/* Backdrop — desktop drawer only; click to dismiss */}
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          'fixed inset-0 z-30 hidden bg-black/40 transition-opacity duration-300 md:block',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <div
        ref={panelRef}
        aria-hidden={!open}
        className={cn(
          'fixed inset-y-0 right-0 z-40 flex w-full flex-col bg-page shadow-[-8px_0_24px_rgba(0,0,0,0.12)] transition-transform duration-300 md:w-[min(480px,100vw)]',
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
      >
        {/* Close button fixed to the panel so it doesn't scroll away.
            Chevron (back) on mobile, X (close) on desktop. */}
        <button
          onClick={onClose}
          aria-label={isDesktop ? 'Close' : 'Go back'}
          className="absolute left-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur transition-colors hover:bg-white"
        >
          {isDesktop ? <X size={19} strokeWidth={2.2} /> : <ChevronLeft size={20} strokeWidth={2.2} />}
        </button>

        {/* Scrollable content */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch]"
        >
          {current && (
            <>
              {/* Full-bleed white product header, flush to the panel edges (not a
                  card). The original-listing link sits in the text column so it
                  aligns with the title and labels rather than the photo. */}
              <div className="bg-white px-4 pb-4 pt-16 shadow-[0_1px_2px_rgba(15,16,26,0.06)]">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={
                      hasOfficialPhotos
                        ? () => setLightbox({ images: current.images, alt: current.displayName })
                        : undefined
                    }
                    aria-label={hasOfficialPhotos ? 'Enlarge product photo' : undefined}
                    className={cn(
                      'h-24 w-24 flex-none overflow-hidden rounded-2xl border border-neutral-100 bg-neutral-50',
                      hasOfficialPhotos ? 'cursor-zoom-in' : 'cursor-default',
                    )}
                  >
                    {hasOfficialPhotos ? (
                      <img
                        src={resolveImage(current.images[0]!)}
                        alt={current.displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <GarmentThumbnail item={current} />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    {store && (
                      <p className="truncate text-[12px] font-medium text-ink-soft">{store}</p>
                    )}
                    <h1 className="text-base font-extrabold leading-tight text-ink">
                      {current.displayName}
                    </h1>
                    <dl className="mt-2 space-y-1 text-[12px]">
                      <div className="flex gap-x-6">
                        <dt className="w-12 flex-none font-medium text-ink-soft">Size</dt>
                        <dd className="font-semibold text-ink">{current.size}</dd>
                      </div>
                      <div className="flex gap-x-6">
                        <dt className="w-12 flex-none font-medium text-ink-soft">Campus</dt>
                        <dd className="font-semibold text-ink">{current.schools.join(' & ')}</dd>
                      </div>
                    </dl>
                    {current.sourceUrl && (
                      <a
                        href={current.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
                      >
                        <ExternalLink size={15} />
                        View original store listing
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {visibleInstances.length > 0 && (
                <section className="flex flex-col gap-3 px-4 pb-6 pt-5">
                  <h2 className="text-base font-extrabold text-ink">
                    {`Available items (${visibleInstances.length})`}
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {visibleInstances.map((inst) => (
                      <InstanceCard key={inst.label} inst={inst} onZoom={setLightbox} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* Photo lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        {lightbox && (
          <DialogContent>
            <div className="h-[min(72vh,640px)] overflow-hidden rounded-2xl bg-white">
              {lightbox.images.length > 1 ? (
                <PhotoGallery images={lightbox.images} alt={lightbox.alt} />
              ) : (
                <img
                  src={resolveImage(lightbox.images[0]!)}
                  alt={lightbox.alt}
                  className="h-full w-full object-contain"
                />
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
