import { Badge, BlockStack, Box, Button, Card, InlineStack, Link, Text, Tooltip } from '@shopify/polaris';
import { editLineUrl, type Item } from '../data/inventory';
import { GarmentThumbnail } from './GarmentThumbnail';

interface Props {
  item: Item;
  /** Sold according to inventory.md (the public source of truth). */
  publishedSold: boolean;
  /** Sold only in this browser via the local toggle. */
  localSold: boolean;
  manageMode: boolean;
  onToggleLocal: (id: string) => void;
}

/** Absolute URLs pass through; repo-relative paths resolve against the site base. */
function resolveImage(src: string): string {
  if (/^https?:\/\//.test(src)) return src;
  return import.meta.env.BASE_URL + src.replace(/^\/+/, '');
}

const truncate: React.CSSProperties = {
  display: 'block',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
};

export function ItemCard({ item, publishedSold, localSold, manageMode, onToggleLocal }: Props) {
  const sold = publishedSold || localSold;

  return (
    <div
      style={{
        height: '100%',
        opacity: sold ? 0.55 : 1,
        filter: sold ? 'grayscale(75%)' : 'none',
        transition: 'opacity 0.25s, filter 0.25s',
      }}
    >
      <Card padding="0">
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {item.image ? (
            <img
              src={resolveImage(item.image)}
              alt={item.name}
              loading="lazy"
              style={{
                height: 150,
                width: '100%',
                objectFit: 'cover',
                display: 'block',
                borderBottom: '1px solid #e3e5e7',
              }}
            />
          ) : (
            <GarmentThumbnail item={item} />
          )}

          <Box padding="300">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
              <InlineStack align="space-between" blockAlign="start" gap="200" wrap={false}>
                <span style={truncate}>
                  <Text variant="headingMd" as="h3" truncate>
                    {item.name}
                  </Text>
                </span>
                {sold ? (
                  <Badge tone="critical">{publishedSold ? 'Sold' : 'Sold (your view)'}</Badge>
                ) : (
                  <Badge tone="success">Available</Badge>
                )}
              </InlineStack>

              <Text variant="bodyMd" as="p" tone="subdued">
                Size {item.size}
              </Text>

              <InlineStack gap="100">
                {item.schools.map((s) => (
                  <Badge key={s} tone="info">
                    {s}
                  </Badge>
                ))}
              </InlineStack>

              {/* Always reserve one line for the condition note so every card is
                  the same height. Long notes truncate and show fully on hover. */}
              <div style={{ minHeight: 18 }}>
                {item.note ? (
                  <Tooltip content={item.note} dismissOnMouseOut>
                    <span style={{ ...truncate, color: '#8a6116', fontSize: 12, cursor: 'help' }}>
                      {item.note}
                    </span>
                  </Tooltip>
                ) : (
                  <span aria-hidden>&nbsp;</span>
                )}
              </div>

              <div style={{ marginTop: 'auto' }}>
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingLg" as="p">
                    {`$${item.unitPrice}`}
                  </Text>
                  <Text variant="bodySm" as="span" tone="subdued">
                    {`$${item.lotPrice} / lot`}
                  </Text>
                </InlineStack>

                {manageMode && (
                  <Box paddingBlockStart="200">
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
                  </Box>
                )}
              </div>
            </div>
          </Box>
        </div>
      </Card>
    </div>
  );
}
