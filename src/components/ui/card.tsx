import { cn } from '../../lib/utils';

/** White rounded surface with a soft shadow — the building block of the page. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-card border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(15,16,26,0.04),0_8px_24px_-12px_rgba(15,16,26,0.12)]',
        className,
      )}
      {...props}
    />
  );
}
