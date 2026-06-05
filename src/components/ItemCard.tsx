import { Badge, BlockStack, Button, Card, InlineStack, Text } from '@shopify/polaris';
import type { Item } from '../data/items';

interface Props {
  item: Item;
  sold: boolean;
  onSell: (id: string) => void;
}

export function ItemCard({ item, sold, onSell }: Props) {
  return (
    <div
      style={{
        opacity: sold ? 0.5 : 1,
        filter: sold ? 'grayscale(70%)' : 'none',
        transition: 'opacity 0.25s, filter 0.25s',
      }}
    >
      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="start">
            <Text variant="headingMd" as="h3">
              {item.name}
            </Text>
            {sold ? (
              <Badge tone="critical">Sold</Badge>
            ) : (
              <Badge tone="success">Available</Badge>
            )}
          </InlineStack>

          <Text variant="bodyMd" as="p">
            Size: <strong>{item.size}</strong>
          </Text>

          {item.note && (
            <Text variant="bodySm" as="p" tone="caution">
              {item.note}
            </Text>
          )}

          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingLg" as="p">
              ${item.unitPrice}
            </Text>
            {!sold && (
              <Button variant="primary" size="slim" onClick={() => onSell(item.id)}>
                Mark as sold
              </Button>
            )}
          </InlineStack>
        </BlockStack>
      </Card>
    </div>
  );
}
