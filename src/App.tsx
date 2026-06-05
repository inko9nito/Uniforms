import { useCallback, useState } from 'react';
import {
  AppProvider,
  Badge,
  Banner,
  BlockStack,
  Box,
  Divider,
  InlineStack,
  Page,
  Text,
} from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';
import { ITEMS, type Item } from './data/items';
import { ItemCard } from './components/ItemCard';

const STORAGE_KEY = 'fca-uniform-sold-ids';

function loadSoldIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function saveSoldIds(ids: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

interface SectionProps {
  title: string;
  items: Item[];
  soldIds: Set<string>;
  onSell: (id: string) => void;
}

function Section({ title, items, soldIds, onSell }: SectionProps) {
  const available = items.filter((i) => !soldIds.has(i.id)).length;
  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <Text variant="headingXl" as="h2">
          {title}
        </Text>
        <Badge tone={available === 0 ? 'critical' : 'success'}>
          {`${available} of ${items.length} available`}
        </Badge>
      </InlineStack>

      <Banner tone="info">
        <Text as="p">
          <strong>$5 each</strong> · or <strong>$30 for the entire {title.toLowerCase()} lot</strong>
        </Text>
      </Banner>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        {items.map((item) => (
          <ItemCard key={item.id} item={item} sold={soldIds.has(item.id)} onSell={onSell} />
        ))}
      </div>
    </BlockStack>
  );
}

export default function App() {
  const [soldIds, setSoldIds] = useState<Set<string>>(loadSoldIds);

  const handleSell = useCallback((id: string) => {
    setSoldIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveSoldIds(next);
      return next;
    });
  }, []);

  const girlsItems = ITEMS.filter((i) => i.section === 'girls');
  const boysItems = ITEMS.filter((i) => i.section === 'boys');
  const totalAvailable = ITEMS.filter((i) => !soldIds.has(i.id)).length;

  return (
    <AppProvider i18n={enTranslations}>
      <Box paddingBlockEnd="800">
        <Page
          title="FCA Carrollton Uniform Resale"
          subtitle={`The Shops at Legacy, Plano · Founders Classical Academy · ${totalAvailable} items still available`}
        >
          <BlockStack gap="800">
            <Section
              title="Girls"
              items={girlsItems}
              soldIds={soldIds}
              onSell={handleSell}
            />
            <Divider />
            <Section
              title="Boys"
              items={boysItems}
              soldIds={soldIds}
              onSell={handleSell}
            />
          </BlockStack>
        </Page>
      </Box>
    </AppProvider>
  );
}
