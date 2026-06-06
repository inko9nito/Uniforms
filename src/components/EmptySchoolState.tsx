import { PackageOpen } from 'lucide-react';

/** Generic placeholder shown when no items match the current filters. */
export function EmptyResults() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-neutral-300 bg-white/60 px-6 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-neutral-100 text-ink-soft">
        <PackageOpen size={26} />
      </div>
      <h3 className="text-lg font-bold text-ink">No items match these filters</h3>
      <p className="max-w-xs text-sm text-ink-soft">
        Try a different campus or category — new items show up here as they're added.
      </p>
    </div>
  );
}
