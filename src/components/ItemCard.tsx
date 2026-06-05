import { Badge, BlockStack, Button, Card, InlineStack, Link, Text } from '@shopify/polaris';
import { editLineUrl, type Item } from '../data/inventory';

interface Props {
  item: Item;
  /** Sold according to inventory.md (the public source of truth). */
  publishedSold: boolean;
  /** Sold only in this browser via the local toggle. */
  localSold: boolean;
  manageMode: boolean;
  onToggleLocal: (id: string) => void;
}

export function ItemCard({ item, publishedSold, localSold, manageMode, onToggleLocal }: Props) {
  const sold = publishedSold || localSold;

  return (
    <div
      style={{
        opacity: sold ? 0.5 : 1,
        filter: sold ? 'grayscale(70%)' : 'none',
        transition: 'opacity 0.25s, filter 0.25s',
        height: '100%',
      }}
    >
      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="start" gap="200">
            <Text variant="headingMd" as="h3">
              {item.name}
            </Text>
            {sold ? (
              <Badge tone="critical">{publishedSold ? 'Sold' : 'Sold (your view)'}</Badge>
            ) : (
              <Badge tone="success">Available</Badge>
            )}
          </InlineStack>

          <Text variant="bodyMd" as="p">
            Size: <strong>{item.size}</strong>
          </Text>

          <InlineStack gap="100">
            {item.schools.map((s) => (
              <Badge key={s} tone="info">
                {s}
              </Badge>
            ))}
          </InlineStack>

          {item.note && (
            <Text variant="bodySm" as="p" tone="caution">
              {item.note}
            </Text>
          )}

          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingLg" as="p">
              {`$${item.unitPrice}`}
            </Text>
          </InlineStack>

          {manageMode && (
            <BlockStack gap="150">
              {!publishedSold && (
                <Button
                  size="slim"
                  variant={localSold ? 'tertiary' : 'primary'}
                  onClick={() => onToggleLocal(item.id)}
                >
                  {localSold ? 'Undo (your view)' : 'Mark as sold (your view)'}
                </Button>
              )}
              <Link url={editLineUrl(item.sourceLine)} target="_blank">
                {publishedSold ? 'Edit on GitHub →' : 'Mark sold on GitHub →'}
              </Link>
            </BlockStack>
          )}
        </BlockStack>
      </Card>
    </div>
  );
}
