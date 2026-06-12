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
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        'group flex h-full flex-col rounded-[20px] bg-white p-2 text-left shadow-[0_2px_8px_-2px_rgba(15,16,26,0.06),0_12px_28px_-18px_rgba(15,16,26,0.22)] transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        sold && 'opacity-60 grayscale',
      )}
    >
      {/* Framed product image on a soft gray panel (Shop-app style) */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
        {item.images.length > 0 ? (
          <img
            src={resolveImage(item.images[0]!)}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
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

      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-2.5">
        <h3 className="truncate text-[15px] font-semibold leading-snug text-ink">
          {item.displayName}
        </h3>
        <p className="mt-0.5 truncate text-[13px] leading-snug text-ink-soft">
          {`Size ${item.size} · ${item.schools.join(' & ')}`}
        </p>
        {item.note && (
          <p className="mt-0.5 truncate text-[13px] leading-snug text-ink-soft" title={item.note}>
            {item.note}
          </p>
        )}
        <p className="mt-2 text-[15px] font-bold text-ink">{priceLabel(item)}</p>
      </div>
    </button>
  );
}
