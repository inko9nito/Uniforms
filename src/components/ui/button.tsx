import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[background-color,box-shadow,transform] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-white hover:bg-black',
        accent: 'bg-brand text-white hover:brightness-110',
        secondary: 'bg-neutral-100 text-ink hover:bg-neutral-200',
        outline: 'border border-neutral-300 bg-white text-ink hover:bg-neutral-50',
        ghost: 'text-ink hover:bg-neutral-100',
        link: 'h-auto rounded-none p-0 font-semibold text-brand hover:underline underline-offset-4',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-[15px]',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type CommonProps = VariantProps<typeof buttonVariants> & {
  className?: string;
  fullWidth?: boolean;
};

type ButtonAsButton = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type ButtonAsLink = CommonProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/** Pill button. Renders an <a> when `href` is set, otherwise a <button>. */
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ className, variant, size, fullWidth, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), fullWidth && 'w-full', className);
    if ('href' in props && props.href !== undefined) {
      const { href, ...rest } = props as ButtonAsLink;
      return (
        <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={classes} {...rest} />
      );
    }
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={classes}
        {...(props as ButtonAsButton)}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
