import { useCallback, useMemo, useState } from 'react';
import Heading from '@atlaskit/heading';
import Lozenge from '@atlaskit/lozenge';
import Select from '@atlaskit/select';
import SectionMessage from '@atlaskit/section-message';
import { LinkButton } from '@atlaskit/button/new';
import { Inline, Stack, Text } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { EDIT_INVENTORY_URL, isSoldOut, ITEMS, type Item, type SchoolName } from './data/inventory';
import { ItemCard } from './components/ItemCard';
import { EmptyResults } from './components/EmptySchoolState';
import { ItemDetailPanel } from './components/ItemDetailPanel';

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

interface FilterOption {
  label: string;
  value: string;
}

const SCHOOL_OPTIONS: (FilterOption & { school: SchoolName | null })[] = [
  { label: 'All campuses', value: 'all', school: null },
  { label: 'Carrollton', value: 'carrollton', school: 'Carrollton' },
  { label: 'Frisco', value: 'frisco', school: 'Frisco' },
];

// Order matches the section order on the page (Girls, Boys, then Unisex).
const GENDER_OPTIONS: (FilterOption & { section: string | null })[] = [
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
    <Stack space="space.200">
      <Inline spread="space-between" alignBlock="center" space="space.100">
        <Heading size="large" as="h2">{title}</Heading>
        <Lozenge appearance={availablePieces === 0 ? 'removed' : 'success'}>
          {`${availablePieces} available`}
        </Lozenge>
      </Inline>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gridAutoRows: '1fr',
          gap: 12,
        }}
      >
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
    </Stack>
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
    <div style={{ minHeight: '100vh', background: token('elevation.surface.sunken', '#f7f8f9') }}>
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '24px 16px 96px' }}>
        <Stack space="space.400">
          <Stack space="space.050">
            <Heading size="xlarge" as="h1">FCA Uniform Resale</Heading>
            <Text color="color.text.subtle">Location: The Shops at Legacy, Plano</Text>
          </Stack>

          <SectionMessage appearance="information">
            <Text>
              Everything below is available unless marked <strong>Sold</strong>. To buy something,{' '}
              <a href={MESSENGER_URL} target="_blank" rel="noreferrer" style={{ color: token('color.link', '#0c66e4') }}>
                message me on Facebook
              </a>
              .
            </Text>
          </SectionMessage>

          {manageMode && (
            <SectionMessage appearance="warning" title="Manage mode">
              <Stack space="space.150">
                <Text>
                  “Mark as sold (your view)” only changes how the page looks in <em>this browser</em> — it’s a
                  scratchpad for you. To change what everyone sees, use the GitHub link on a card (or edit the
                  table directly) and commit. Only people with write access to the repo can do that, so buyers
                  can’t alter your listings.
                </Text>
                <div>
                  <LinkButton appearance="primary" href={EDIT_INVENTORY_URL} target="_blank">
                    Edit full inventory on GitHub
                  </LinkButton>
                </div>
              </Stack>
            </SectionMessage>
          )}

          <Inline space="space.200" shouldWrap>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Text size="small" weight="medium">Campus</Text>
              <Select<FilterOption>
                inputId="campus-filter"
                options={SCHOOL_OPTIONS}
                value={SCHOOL_OPTIONS.find((o) => o.value === schoolId) ?? null}
                onChange={(opt) => setSchoolId(opt?.value ?? 'all')}
                isSearchable={false}
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Text size="small" weight="medium">Gender</Text>
              <Select<FilterOption>
                inputId="gender-filter"
                options={GENDER_OPTIONS}
                value={GENDER_OPTIONS.find((o) => o.value === sectionId) ?? null}
                onChange={(opt) => setSectionId(opt?.value ?? 'all')}
                isSearchable={false}
              />
            </div>
          </Inline>

          {sections.length === 0 ? (
            <EmptyResults />
          ) : (
            <Stack space="space.500">
              {sections.map((section) => (
                <Section
                  key={section.name}
                  title={section.name}
                  items={section.items}
                  localSold={localSold}
                  manageMode={manageMode}
                  onToggleLocal={handleToggleLocal}
                  onOpen={setSelectedItem}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </div>

      <ItemDetailPanel
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        messengerUrl={MESSENGER_URL}
        manageMode={manageMode}
      />

      {/* Floating manage mode toggle — visible over the detail panel */}
      <button
        onClick={() => setManageMode((m) => !m)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 300,
          height: 44,
          padding: '0 20px',
          borderRadius: 22,
          background: manageMode ? '#303030' : '#ffffff',
          color: manageMode ? '#ffffff' : '#303030',
          border: '1.5px solid',
          borderColor: manageMode ? '#303030' : '#c9cccf',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
          letterSpacing: '-0.01em',
        }}
      >
        {manageMode ? 'Done editing' : 'Edit'}
      </button>
    </div>
  );
}
