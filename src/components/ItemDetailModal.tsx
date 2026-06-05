import { useRef } from 'react';
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
  const start = useRef<{ x: number; y: number } | null>(null);

  // Swipe-to-dismiss: an edge swipe right (iOS-style back) or a downward swipe
  // from the top closes the overlay. Horizontal swipes inside the photo gallery
  // stay with the gallery since those don't start at the screen edge / top.
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) start.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const s = start.current;
    const t = e.changedTouches[0];
    start.current = null;
    if (!s || !t) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    const edgeBack = s.x < 28 && dx > 70 && Math.abs(dy) < 50;
    const swipeDown = s.y < 90 && dy > 90 && Math.abs(dx) < 60;
    if (edgeBack || swipeDown) onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={item?.displayName ?? ''} size="fullScreen">
      {item && (
        <Modal.Section>
          <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
          </div>
        </Modal.Section>
      )}
    </Modal>
  );
}
