import { Badge, BlockStack, Box, Button, InlineStack, Modal, Text } from '@shopify/polaris';
import type { Item } from '../data/inventory';
import { GarmentThumbnail } from './GarmentThumbnail';
import { PhotoGallery } from './PhotoGallery';

interface Props {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  messengerUrl: string;
}

export function ItemDetailModal({ item, open, onClose, messengerUrl }: Props) {
  const soldOut = item ? item.quantity <= 0 : false;

  return (
    <Modal open={open} onClose={onClose} title={item?.displayName ?? ''}>
      {item && (
        <Modal.Section>
          <BlockStack gap="400">
            {item.images.length > 0 ? (
              <PhotoGallery images={item.images} alt={item.displayName} />
            ) : (
              <GarmentThumbnail item={item} />
            )}

            <InlineStack gap="200" blockAlign="center">
              {soldOut ? (
                <Badge tone="critical">Sold out</Badge>
              ) : (
                <Badge tone="success">{`${item.quantity} available`}</Badge>
              )}
              {item.schools.map((s) => (
                <Badge key={s} tone="info">
                  {s}
                </Badge>
              ))}
            </InlineStack>

            <Text variant="headingLg" as="p">
              {`$${item.unitPrice}`}
            </Text>

            <BlockStack gap="100">
              <Text as="p" tone="subdued">
                {`Size ${item.size}`}
              </Text>
              {item.note && (
                <Text as="p" tone="caution">
                  {item.note}
                </Text>
              )}
            </BlockStack>

            {item.sourceUrl && (
              <Box>
                <Button url={item.sourceUrl} target="_blank" variant="plain">
                  View original listing in the store →
                </Button>
              </Box>
            )}

            <Box paddingBlockStart="200">
              <Button url={messengerUrl} target="_blank" variant="primary" fullWidth>
                Message me on Facebook to buy
              </Button>
            </Box>
          </BlockStack>
        </Modal.Section>
      )}
    </Modal>
  );
}
