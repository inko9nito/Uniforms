import type { Item } from '../data/inventory';

type GarmentKind = 'polo' | 'tee' | 'shorts' | 'skort' | 'pants';

function kindFor(name: string): GarmentKind {
  const n = name.toLowerCase();
  if (n.includes('pants')) return 'pants';
  if (n.includes('shorts')) return 'shorts';
  if (n.includes('skort')) return 'skort';
  if (n.includes('polo')) return 'polo';
  if (n.includes('spirit') || n.includes('shirt')) return 'tee';
  return 'polo';
}

/** Returns [fill, stroke] colors for the garment. */
function colorsFor(name: string, kind: GarmentKind): [string, string] {
  const n = name.toLowerCase();
  if (n.includes('navy')) return ['#26344f', '#1a2438'];
  if (n.includes('gray') || n.includes('grey')) return ['#a8aeb8', '#878d97'];
  if (n.includes('white')) return ['#eef0f3', '#c9ced6'];
  if (n.includes('spirit')) return ['#26344f', '#1a2438'];
  if (kind === 'shorts') return ['#ccbb98', '#ab9a78']; // khaki walking shorts
  if (kind === 'skort') return ['#9aa0aa', '#7c828c']; // plaid-ish gray
  return ['#26344f', '#1a2438'];
}

const PATHS: Record<GarmentKind, string> = {
  // short-sleeve collared polo
  polo:
    'M37 18 L46 22 Q50 27 54 22 L63 18 L84 31 L76 44 L70 40 L70 86 Q70 89 67 89 L33 89 Q30 89 30 86 L30 40 L24 44 L16 31 Z',
  // crew-neck tee
  tee:
    'M37 18 Q50 30 63 18 L84 31 L76 45 L70 41 L70 86 Q70 89 67 89 L33 89 Q30 89 30 86 L30 41 L24 45 L16 31 Z',
  // walking shorts
  shorts:
    'M28 30 H72 L70 78 H56 L50 48 L44 78 H30 Z',
  // pleated skort (skirt silhouette)
  skort:
    'M32 28 H68 L80 84 H20 Z',
  // long twill pants
  pants:
    'M31 24 H69 L66 92 H55 L50 44 L45 92 H34 Z',
};

interface Props {
  item: Item;
}

/**
 * A clean, uniform garment silhouette used as the product image so every
 * card has a consistent media area even without a photograph.
 */
export function GarmentThumbnail({ item }: Props) {
  const kind = kindFor(item.name);
  const [fill, stroke] = colorsFor(item.name, kind);

  return (
    <div
      style={{
        height: '100%',
        minHeight: 160,
        width: '100%',
        background: 'linear-gradient(180deg, #fafbfb 0%, #f1f2f4 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        viewBox="0 0 100 110"
        width="96"
        height="106"
        role="img"
        aria-label={item.name}
      >
        <path
          d={PATHS[kind]}
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {kind === 'polo' && (
          <path
            d="M46 22 L50 34 L54 22"
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}
        {kind === 'skort' && (
          <g stroke={stroke} strokeWidth={1.5} opacity={0.7}>
            <line x1="42" y1="30" x2="38" y2="84" />
            <line x1="50" y1="30" x2="50" y2="84" />
            <line x1="58" y1="30" x2="62" y2="84" />
          </g>
        )}
      </svg>
    </div>
  );
}
