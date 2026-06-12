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
    // Outer wrapper: no background, border, or shadow — transparent.
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        'group flex min-w-0 flex-col text-left focus:outline-none',
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
        <div className="absolute left-2 top-2">
          {sold ? (
            <Badge variant="danger" className="shadow-sm">Sold out</Badge>
          ) : (
            <Badge variant={badgeVariant(item.badge.tone)} className="shadow-sm">
              {item.badge.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Text sits in the negative space below the tile — no card behind it. */}
      <div className="mt-2.5 min-w-0 px-0.5">
        <h3 className="truncate text-[15px] font-semibold leading-tight text-ink">
          {item.displayName}
        </h3>
        <p className="mt-1 truncate text-[12px] leading-snug text-ink-soft">
          {`Size ${item.size} · ${item.schools.join(' & ')}`}
        </p>
        {item.note && (
          <p className="truncate text-[12px] leading-snug text-ink-soft" title={item.note}>
            {item.note}
          </p>
        )}
        <p className="mt-1.5 text-[15px] font-bold text-ink">{priceLabel(item)}</p>
      </div>
    </button>
  );
}
