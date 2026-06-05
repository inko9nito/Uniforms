import { useCallback, useMemo, useState } from 'react';
import {
  AppProvider,
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Divider,
  InlineStack,
  Link,
  Page,
  Select,
  Text,
} from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';
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

const SCHOOL_OPTIONS: { label: string; value: string; school: SchoolName | null }[] = [
  { label: 'All campuses', value: 'all', school: null },
  { label: 'Carrollton', value: 'carrollton', school: 'Carrollton' },
  { label: 'Frisco', value: 'frisco', school: 'Frisco' },
];

// Order matches the section order on the page (Girls, Boys, then Unisex).
const GENDER_OPTIONS: { label: string; value: string; section: string | null }[] = [
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
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center" gap="200">
        <Text variant="headingXl" as="h2">
          {title}
        </Text>
        <Badge tone={availablePieces === 0 ? 'critical' : 'success'}>
          {`${availablePieces} available`}
        </Badge>
      </InlineStack>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gridAutoRows: '1fr',
          gap: '12px',
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
    </BlockStack>
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
    <AppProvider i18n={enTranslations}>
      <Box paddingBlockEnd="800">
        <Page
          title="FCA Uniform Resale"
          subtitle="Location: The Shops at Legacy, Plano"
        >
          <Box paddingBlockStart="200">
          <BlockStack gap="600">
            <Banner tone="info">
              <Text as="p">
                Everything below is available unless marked <strong>Sold</strong>. To buy
                something,{' '}
                <Link url={MESSENGER_URL} external>
                  message me on Facebook
                </Link>
                .
              </Text>
            </Banner>

            {manageMode && (
              <Banner tone="warning" title="Manage mode">
                <BlockStack gap="200">
                  <Text as="p">
                    “Mark as sold (your view)” only changes how the page looks in{' '}
                    <em>this browser</em> — it’s a scratchpad for you. To change what
                    everyone sees, use the GitHub link on a card (or edit the table
                    directly) and commit. Only people with write access to the repo can
                    do that, so buyers can’t alter your listings.
                  </Text>
                  <InlineStack>
                    <Button url={EDIT_INVENTORY_URL} target="_blank" variant="primary">
                      Edit full inventory on GitHub
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Banner>
            )}

            <InlineStack gap="300" wrap={false}>
              <div style={{ flex: 1 }}>
                <Select
                  label="Campus"
                  options={SCHOOL_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                  value={schoolId}
                  onChange={setSchoolId}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Gender"
                  options={GENDER_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                  value={sectionId}
                  onChange={setSectionId}
                />
              </div>
            </InlineStack>

            {sections.length === 0 ? (
              <EmptyResults />
            ) : (
              sections.map((section, i) => (
                <BlockStack key={section.name} gap="600">
                  {i > 0 && <Divider />}
                  <Section
                    title={section.name}
                    items={section.items}
                    localSold={localSold}
                    manageMode={manageMode}
                    onToggleLocal={handleToggleLocal}
                    onOpen={setSelectedItem}
                  />
                </BlockStack>
              ))
            )}
          </BlockStack>
          </Box>
        </Page>

        <ItemDetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          messengerUrl={MESSENGER_URL}
          manageMode={manageMode}
        />
      </Box>

      {/* Floating manage mode toggle — visible over the detail panel */}
      <button
        onClick={() => setManageMode((m) => !m)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 530,
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
    </AppProvider>
  );
}
