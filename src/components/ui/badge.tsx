import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5',
  {
    variants: {
      variant: {
        success: 'bg-green-100 text-green-700',
        warning: 'bg-amber-100 text-amber-800',
        danger: 'bg-red-100 text-red-700',
        neutral: 'bg-neutral-100 text-neutral-600',
        brand: 'bg-brand-soft text-brand',
        dark: 'bg-ink text-white',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
