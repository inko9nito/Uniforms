import Heading from '@atlaskit/heading';
import { Stack, Text } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';

/** Generic placeholder shown when no items match the current filters. */
export function EmptyResults() {
  return (
    <div
      style={{
        padding: 32,
        borderRadius: 12,
        background: token('elevation.surface.sunken', '#f7f8f9'),
        border: `1px solid ${token('color.border', '#091E4224')}`,
      }}
    >
      <Stack space="space.150" alignInline="center">
        <svg viewBox="0 0 64 64" width="72" height="72" role="img" aria-label="No items">
          <rect x="10" y="20" width="44" height="32" rx="3" fill={token('color.background.neutral', '#f1f2f4')} stroke={token('color.border', '#c9ced6')} strokeWidth="2" />
          <path d="M10 28 H54" stroke={token('color.border', '#c9ced6')} strokeWidth="2" />
          <path d="M24 20 V15 a8 8 0 0 1 16 0 V20" fill="none" stroke={token('color.border', '#c9ced6')} strokeWidth="2" />
        </svg>
        <Heading size="medium">No items match these filters</Heading>
        <Text color="color.text.subtle" align="center">
          Try a different school or category — new items show up here as they're added.
        </Text>
      </Stack>
    </div>
  );
}
