import { useMemo, useState } from 'react';
import { Badge } from './components/ui/badge';
import { Select, type SelectOption } from './components/ui/select';
import { ITEMS, type Item, type SchoolName } from './data/inventory';
import { ItemCard } from './components/ItemCard';
import { EmptyResults } from './components/EmptySchoolState';
import { ItemDetailPanel } from './components/ItemDetailPanel';
import { cn } from './lib/utils';

const SCHOOL_OPTIONS: (SelectOption & { school: SchoolName | null })[] = [
  { label: 'All campuses', value: 'all', school: null },
  { label: 'Carrollton', value: 'carrollton', school: 'Carrollton' },
  { label: 'Frisco', value: 'frisco', school: 'Frisco' },
];

// Order matches the section order on the page (Girls, Boys, then Unisex).
const GENDER_OPTIONS: (SelectOption & { section: string | null })[] = [
  { label: 'All genders', value: 'all', section: null },
  { label: 'Girls', value: 'girls', section: 'Girls' },
  { label: 'Boys', value: 'boys', section: 'Boys' },
  { label: 'Unisex', value: 'unisex', section: 'Unisex' },
];

interface SectionProps {
  title: string;
  items: Item[];
  onOpen: (item: Item) => void;
}

function Section({ title, items, onOpen }: SectionProps) {
  if (items.length === 0) return null;

  const availablePieces = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 className="text-xl font-extrabold tracking-tight text-ink">{title}</h2>
        <Badge variant={availablePieces === 0 ? 'danger' : 'success'}>
          {`${availablePieces} available`}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-full"
    >
      <span
        className={cn(
          'relative h-6 w-[42px] flex-none rounded-full transition-colors',
          checked ? 'bg-brand' : 'bg-neutral-300',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked && 'translate-x-[18px]',
          )}
        />
      </span>
      <span className="text-sm font-semibold text-ink">{label}</span>
    </button>
  );
}

export default function App() {
  const [schoolId, setSchoolId] = useState('all');
  const [sectionId, setSectionId] = useState('all');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const activeSchool = SCHOOL_OPTIONS.find((s) => s.value === schoolId)?.school ?? null;
  const activeSection = GENDER_OPTIONS.find((s) => s.value === sectionId)?.section ?? null;

  const visibleItems = useMemo(
    () =>
      ITEMS.filter(
        (i) =>
          (activeSchool ? i.schools.includes(activeSchool) : true) &&
          (activeSection ? i.section === activeSection : true) &&
          (availableOnly ? i.availableCount > 0 : true),
      ),
    [activeSchool, activeSection, availableOnly],
  );

  const sections = useMemo(() => {
    const order: string[] = [];
    for (const item of visibleItems) {
      if (!order.includes(item.section)) order.push(item.section);
    }
    return order.map((name) => ({
      name,
      items: visibleItems.filter((i) => i.section === name),
    }));
  }, [visibleItems]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6">
        <header className="mb-5">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            FCA Uniform Resale
          </h1>
          <p className="mt-0.5 text-sm font-medium text-ink-soft">The Shops at Legacy, Plano</p>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft">
              Campus
            </label>
            <Select
              ariaLabel="Filter by campus"
              value={schoolId}
              onValueChange={setSchoolId}
              options={SCHOOL_OPTIONS}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft">
              Gender
            </label>
            <Select
              ariaLabel="Filter by gender"
              value={sectionId}
              onValueChange={setSectionId}
              options={GENDER_OPTIONS}
            />
          </div>
        </div>

        <div className="mt-4">
          <Toggle checked={availableOnly} onChange={setAvailableOnly} label="Available only" />
        </div>

        <div className="mt-7 flex flex-col gap-8">
          {sections.length === 0 ? (
            <EmptyResults />
          ) : (
            sections.map((section) => (
              <Section
                key={section.name}
                title={section.name}
                items={section.items}
                onOpen={setSelectedItem}
              />
            ))
          )}
        </div>
      </div>

      <ItemDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
