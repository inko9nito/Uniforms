import { Badge } from './ui/badge';
import { badgeVariant, isSoldOut, priceLabel, resolveImage, type Item } from '../data/inventory';
import { GarmentThumbnail } from './GarmentThumbnail';
import { cn } from '../lib/utils';

interface Props {
  item: Item;
  onOpen: (item: Item) => void;
}

export function ItemCard({ item, onOpen }: Props) {
  const sold = isSoldOut(item);

  return (
    // Outer wrapper: transparent (no surface). Plain block layout so the text
    // children truncate against the grid track instead of fighting flex sizing.
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(item);
        }
      }}
      className={cn(
        'group min-w-0 cursor-pointer focus:outline-none',
        sold && 'opacity-60 grayscale',
      )}
    >
      {/* Only the photo is the "tile": white surface, rounded, subtle shadow. */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_2px_8px_-2px_rgba(15,16,26,0.06),0_12px_28px_-18px_rgba(15,16,26,0.20)] transition-transform duration-200 group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-brand/40">
        {item.images.length > 0 ? (
          <img
            src={resolveImage(item.images[0]!)}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <GarmentThumbnail item={item} />
        )}
        <div className="absolute left-1.5 top-1.5">
          {sold ? (
            <Badge variant="danger" className="px-2 py-0.5 text-[10px] shadow-sm">Sold out</Badge>
          ) : (
            <Badge
              variant={badgeVariant(item.badge.tone)}
              className="px-2 py-0.5 text-[10px] shadow-sm"
            >
              {item.badge.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Text sits in the negative space below the tile — no card behind it. */}
      <div className="mt-2 overflow-hidden">
        <h3 className="truncate text-[13px] font-semibold leading-snug text-ink">
          {item.displayName}
        </h3>
        <p className="mt-0.5 truncate text-[11px] leading-snug text-ink-soft">
          {`Size ${item.size} · ${item.schools.join(' & ')}`}
        </p>
        {item.note && (
          <p className="truncate text-[11px] leading-snug text-ink-soft" title={item.note}>
            {item.note}
          </p>
        )}
        <p className="mt-1 text-[14px] font-bold text-ink">{priceLabel(item)}</p>
      </div>
    </div>
  );
}
