import { BlockStack, Box, Card, Text } from '@shopify/polaris';

interface Props {
  school: string;
}

/** Friendly placeholder shown when a school tab has no items listed. */
export function EmptySchoolState({ school }: Props) {
  return (
    <Card>
      <Box padding="800">
        <BlockStack gap="300" inlineAlign="center">
          <svg viewBox="0 0 64 64" width="72" height="72" role="img" aria-label="No items">
            <rect x="10" y="20" width="44" height="32" rx="3" fill="#f1f2f4" stroke="#c9ced6" strokeWidth="2" />
            <path d="M10 28 H54" stroke="#c9ced6" strokeWidth="2" />
            <path d="M24 20 V15 a8 8 0 0 1 16 0 V20" fill="none" stroke="#c9ced6" strokeWidth="2" />
          </svg>
          <Text variant="headingMd" as="h3">
            {`Nothing listed for ${school} yet`}
          </Text>
          <Text variant="bodyMd" as="p" tone="subdued" alignment="center">
            {`Items that fit ${school} — like sweaters that work at either campus — will show up here as they're added.`}
          </Text>
        </BlockStack>
      </Box>
    </Card>
  );
}
