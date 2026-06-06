import { useCallback, useMemo, useState } from 'react';
import { Info, Pencil, Check } from 'lucide-react';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Select, type SelectOption } from './components/ui/select';
import { EDIT_INVENTORY_URL, isSoldOut, ITEMS, type Item, type SchoolName } from './data/inventory';
import { ItemCard } from './components/ItemCard';
import { EmptyResults } from './components/EmptySchoolState';
import { ItemDetailPanel } from './components/ItemDetailPanel';
import { cn } from './lib/utils';

const STORAGE_KEY = 'fca-uniform-local-sold-ids';
const MESSENGER_URL = 'https://m.me/inko9nito?hash=AbZ0fXAb8rAGhWaG&source_id=8585216';

function loadLocalSold(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function saveLocalSold(ids: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

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
  localSold: Set<string>;
  manageMode: boolean;
  onToggleLocal: (id: string) => void;
  onOpen: (item: Item) => void;
}

function Section({ title, items, localSold, manageMode, onToggleLocal, onOpen }: SectionProps) {
  if (items.length === 0) return null;

  const availablePieces = items.reduce(
    (sum, i) => sum + (localSold.has(i.id) ? 0 : i.quantity),
    0,
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 className="text-xl font-extrabold tracking-tight text-ink">{title}</h2>
        <Badge variant={availablePieces === 0 ? 'danger' : 'success'}>
          {`${availablePieces} available`}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            publishedSold={isSoldOut(item)}
            localSold={localSold.has(item.id)}
            manageMode={manageMode}
            onToggleLocal={onToggleLocal}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [localSold, setLocalSold] = useState<Set<string>>(loadLocalSold);
  const [schoolId, setSchoolId] = useState('all');
  const [manageMode, setManageMode] = useState(false);
  const [sectionId, setSectionId] = useState('all');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const handleToggleLocal = useCallback((id: string) => {
    setLocalSold((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveLocalSold(next);
      return next;
    });
  }, []);

  const activeSchool = SCHOOL_OPTIONS.find((s) => s.value === schoolId)?.school ?? null;
  const activeSection = GENDER_OPTIONS.find((s) => s.value === sectionId)?.section ?? null;

  const visibleItems = useMemo(
    () =>
      ITEMS.filter(
        (i) =>
          (activeSchool ? i.schools.includes(activeSchool) : true) &&
          (activeSection ? i.section === activeSection : true),
      ),
    [activeSchool, activeSection],
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
          <p className="mt-0.5 text-sm font-medium text-ink-soft">
            The Shops at Legacy, Plano
          </p>
        </header>

        <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,16,26,0.04)]">
          <div className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full bg-brand-soft text-brand">
            <Info size={16} />
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">
            Everything below is available unless marked <strong className="text-ink">Sold</strong>.
            To buy something,{' '}
            <a
              href={MESSENGER_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand hover:underline"
            >
              message me on Facebook
            </a>
            .
          </p>
        </div>

        {manageMode && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm leading-relaxed text-amber-900">
              <strong>Manage mode.</strong> “Mark as sold (your view)” only changes how the page
              looks in <em>this browser</em> — it’s a scratchpad. To change what everyone sees, edit
              the listing in Airtable (or use the GitHub link on a card). Buyers can’t alter your
              listings.
            </p>
            <div className="mt-3">
              <Button href={EDIT_INVENTORY_URL} target="_blank" rel="noreferrer" variant="primary" size="sm">
                Edit full inventory on GitHub
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
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

        <div className="mt-7 flex flex-col gap-8">
          {sections.length === 0 ? (
            <EmptyResults />
          ) : (
            sections.map((section) => (
              <Section
                key={section.name}
                title={section.name}
                items={section.items}
                localSold={localSold}
                manageMode={manageMode}
                onToggleLocal={handleToggleLocal}
                onOpen={setSelectedItem}
              />
            ))
          )}
        </div>
      </div>

      <ItemDetailPanel
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        messengerUrl={MESSENGER_URL}
        manageMode={manageMode}
      />

      {/* Floating manage-mode toggle — sits above the page and the detail drawer,
          below the photo lightbox. */}
      <button
        onClick={() => setManageMode((m) => !m)}
        className={cn(
          'fixed bottom-5 right-5 z-50 inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold shadow-lg transition-colors',
          manageMode
            ? 'bg-ink text-white hover:bg-black'
            : 'border border-neutral-200 bg-white text-ink hover:bg-neutral-50',
        )}
      >
        {manageMode ? <Check size={17} /> : <Pencil size={16} />}
        {manageMode ? 'Done editing' : 'Edit'}
      </button>
    </div>
  );
}
