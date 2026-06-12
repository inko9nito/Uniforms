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
        'flex h-full flex-col overflow-hidden rounded-3xl border border-black/[0.04] bg-white text-left shadow-[0_1px_2px_rgba(15,16,26,0.04),0_10px_24px_-16px_rgba(15,16,26,0.18)] transition-[opacity,filter,transform] duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        sold && 'opacity-60 grayscale',
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-neutral-50">
        {item.images.length > 0 ? (
          <img
            src={resolveImage(item.images[0]!)}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <GarmentThumbnail item={item} />
        )}
        <div className="absolute left-2.5 top-2.5">
          {sold ? (
            <Badge variant="danger">Sold out</Badge>
          ) : (
            <Badge variant={badgeVariant(item.badge.tone)}>{item.badge.label}</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="truncate text-sm font-bold text-ink">{item.displayName}</h3>
        <p className="truncate text-xs font-medium text-ink-soft">
          {`Size ${item.size} · ${item.schools.join(' & ')}`}
        </p>
        <div className="min-h-4">
          {item.note ? (
            <p className="truncate text-xs font-medium text-amber-700" title={item.note}>
              {item.note}
            </p>
          ) : (
            <span aria-hidden>&nbsp;</span>
          )}
        </div>
        <p className="mt-auto pt-1 text-base font-extrabold text-ink">{priceLabel(item)}</p>
      </div>
    </button>
  );
}
