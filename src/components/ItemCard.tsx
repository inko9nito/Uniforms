import Heading from '@atlaskit/heading';
import Lozenge from '@atlaskit/lozenge';
import Button, { LinkButton } from '@atlaskit/button/new';
import { Stack, Text } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { editLineUrl, lozengeAppearance, priceLabel, resolveImage, type Item } from '../data/inventory';
import { GarmentThumbnail } from './GarmentThumbnail';

interface Props {
  item: Item;
  /** Sold according to the inventory source of truth. */
  publishedSold: boolean;
  /** Sold only in this browser via the local toggle. */
  localSold: boolean;
  manageMode: boolean;
  onToggleLocal: (id: string) => void;
  onOpen: (item: Item) => void;
}

const truncate: React.CSSProperties = {
  display: 'block',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
};

export function ItemCard({
  item,
  publishedSold,
  localSold,
  manageMode,
  onToggleLocal,
  onOpen,
}: Props) {
  const sold = publishedSold || localSold;

  return (
    <div
      style={{
        height: '100%',
        opacity: sold ? 0.55 : 1,
        filter: sold ? 'grayscale(75%)' : 'none',
        transition: 'opacity 0.25s, filter 0.25s',
        display: 'flex',
        flexDirection: 'column',
        background: token('elevation.surface', '#fff'),
        borderRadius: 8,
        border: `1px solid ${token('color.border', '#091E4224')}`,
        boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9,30,66,0.25)'),
        overflow: 'hidden',
      }}
    >
      {/* Clickable area opens the detail view; manage controls below are not part of it. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(item);
          }
        }}
        style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        <div
          style={{
            position: 'relative',
            height: 160,
            overflow: 'hidden',
            borderBottom: `1px solid ${token('color.border', '#e3e5e7')}`,
          }}
        >
          {item.images.length > 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, background: token('elevation.surface', '#fff'), boxSizing: 'border-box' }}>
              <img
                src={resolveImage(item.images[0]!)}
                alt={item.name}
                loading="lazy"
                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
              />
            </div>
          ) : (
            <GarmentThumbnail item={item} />
          )}
          <div style={{ position: 'absolute', top: 8, left: 8 }}>
            {sold ? (
              <Lozenge appearance="removed">{publishedSold ? 'Sold out' : 'Sold (your view)'}</Lozenge>
            ) : (
              <Lozenge appearance={lozengeAppearance(item.badge.tone)}>{item.badge.label}</Lozenge>
            )}
          </div>
        </div>

        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', flex: 1, gap: 4 }}>
          <span style={truncate}>
            <Heading size="xsmall" as="h3">{item.displayName}</Heading>
          </span>

          <span style={truncate}>
            <Text size="small" color="color.text.subtle">
              {`Size ${item.size} · ${item.schools.join(' & ')}`}
            </Text>
          </span>

          {/* Reserve one line for the condition note so cards stay equal height.
              Long notes truncate; the full text shows on hover via title. */}
          <div style={{ minHeight: 16 }}>
            {item.note ? (
              <span style={{ ...truncate, color: token('color.text.accent.orange', '#8a6116'), fontSize: 12 }} title={item.note}>
                {item.note}
              </span>
            ) : (
              <span aria-hidden>&nbsp;</span>
            )}
          </div>

          <div style={{ marginTop: 'auto' }}>
            <Heading size="small" as="span">{priceLabel(item)}</Heading>
          </div>
        </div>
      </div>

      {manageMode && (
        <div style={{ padding: '0 12px 12px' }}>
          <Stack space="space.075">
            {!publishedSold && (
              <Button
                appearance={localSold ? 'subtle' : 'primary'}
                spacing="compact"
                shouldFitContainer
                onClick={() => onToggleLocal(item.id)}
              >
                {localSold ? 'Undo (your view)' : 'Mark as sold (your view)'}
              </Button>
            )}
            <LinkButton appearance="subtle" spacing="compact" href={editLineUrl(item.sourceLine)} target="_blank">
              {publishedSold ? 'Edit on GitHub →' : 'Mark sold on GitHub →'}
            </LinkButton>
          </Stack>
        </div>
      )}
    </div>
  );
}
