import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  label: string;
  value: string;
}

interface Props {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

/** Rounded, pill-ish dropdown matching the storefront look (Radix under the hood). */
export function Select({ value, onValueChange, options, ariaLabel, disabled, className }: Props) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-medium text-ink shadow-sm transition-colors hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 data-[placeholder]:text-ink-soft',
          className,
        )}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon>
          <ChevronDown size={16} className="text-ink-soft" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-[1100] overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-xl"
        >
          <SelectPrimitive.Viewport className="min-w-[var(--radix-select-trigger-width)]">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className="relative flex cursor-pointer select-none items-center rounded-xl py-2 pl-3 pr-8 text-sm font-medium text-ink outline-none data-[highlighted]:bg-neutral-100 data-[state=checked]:text-brand"
              >
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2.5">
                  <Check size={16} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
