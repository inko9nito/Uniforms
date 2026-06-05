import { useCallback, useMemo, useState } from 'react';
import {
  AppProvider,
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Divider,
  InlineStack,
  Link,
  Page,
  Tabs,
  Text,
} from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';
import { EDIT_INVENTORY_URL, ITEMS, type Item, type SchoolName } from './data/inventory';
import { ItemCard } from './components/ItemCard';
import { EmptyResults } from './components/EmptySchoolState';
import { ItemDetailModal } from './components/ItemDetailModal';

const STORAGE_KEY = 'fca-uniform-local-sold-ids';
const MESSENGER_URL = 'https://m.me/inko9nito';

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

const SCHOOL_TABS: { id: string; content: string; school: SchoolName | null }[] = [
  { id: 'all', content: 'All schools', school: null },
  { id: 'carrollton', content: 'Carrollton', school: 'Carrollton' },
  { id: 'frisco', content: 'Frisco', school: 'Frisco' },
];

const SECTION_FILTERS: { id: string; label: string; section: string | null }[] = [
  { id: 'all', label: 'All', section: null },
  { id: 'boys', label: 'Boys', section: 'Boys' },
  { id: 'girls', label: 'Girls', section: 'Girls' },
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
          gap: '12px',
        }}
      >
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            publishedSold={item.quantity <= 0}
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
  const [tabIndex, setTabIndex] = useState(0);
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

  const activeSchool = SCHOOL_TABS[tabIndex]?.school ?? null;
  const activeSection = SECTION_FILTERS.find((s) => s.id === sectionId)?.section ?? null;

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
          primaryAction={{
            content: 'Message me on Facebook',
            url: MESSENGER_URL,
            external: true,
          }}
          secondaryActions={[
            {
              content: manageMode ? 'Done managing' : 'Manage inventory',
              onAction: () => setManageMode((m) => !m),
            },
          ]}
        >
          <Box paddingInline={{ xs: '400', sm: '500' }} paddingBlockStart="200">
          <BlockStack gap="600">
            <Banner tone="success">
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

            <Tabs tabs={SCHOOL_TABS} selected={tabIndex} onSelect={setTabIndex} />

            <ButtonGroup variant="segmented">
              {SECTION_FILTERS.map((s) => (
                <Button
                  key={s.id}
                  pressed={sectionId === s.id}
                  onClick={() => setSectionId(s.id)}
                >
                  {s.label}
                </Button>
              ))}
            </ButtonGroup>

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

        <ItemDetailModal
          item={selectedItem}
          open={selectedItem !== null}
          onClose={() => setSelectedItem(null)}
          messengerUrl={MESSENGER_URL}
        />
      </Box>
    </AppProvider>
  );
}
