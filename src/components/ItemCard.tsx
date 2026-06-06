import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { badgeVariant, editLineUrl, priceLabel, resolveImage, type Item } from '../data/inventory';
import { GarmentThumbnail } from './GarmentThumbnail';
import { cn } from '../lib/utils';

interface Props {
  item: Item;
  /** Sold according to the inventory source of truth. */
  publishedSold: boolean;
  /** Sold only in this browser via the local toggle. */
  localSold: boolean;
  manageMode: boolean;
  onToggleLocal: (id: string) => void;
  onOpen: (item: Item) => void;
}

export function ItemCard({
  item,
  publishedSold,
  localSold,
  manageMode,
  onToggleLocal,
  onOpen,
}: Props) {
  const sold = publishedSold || localSold;

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(15,16,26,0.04),0_10px_24px_-16px_rgba(15,16,26,0.18)] transition-[opacity,filter,transform] duration-200 hover:-translate-y-0.5',
        sold && 'opacity-60 grayscale',
      )}
    >
      {/* Clickable area opens the detail view; manage controls below are separate. */}
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
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
              <Badge variant="danger">{publishedSold ? 'Sold out' : 'Sold (your view)'}</Badge>
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

      {manageMode && (
        <div className="flex flex-col gap-1.5 px-3 pb-3">
          {!publishedSold && (
            <Button
              variant={localSold ? 'secondary' : 'primary'}
              size="sm"
              fullWidth
              onClick={() => onToggleLocal(item.id)}
            >
              {localSold ? 'Undo (your view)' : 'Mark as sold (your view)'}
            </Button>
          )}
          <a
            href={editLineUrl(item.sourceLine)}
            target="_blank"
            rel="noreferrer"
            className="text-center text-xs font-semibold text-brand hover:underline"
          >
            {publishedSold ? 'Edit on GitHub →' : 'Mark sold on GitHub →'}
          </a>
        </div>
      )}
    </div>
  );
}
