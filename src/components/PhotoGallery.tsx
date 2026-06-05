import { useRef, useState } from 'react';
import { resolveImage } from '../data/inventory';

interface Props {
  images: string[];
  alt: string;
}

/** Horizontally swipeable photo gallery with scroll-snap and dot indicators. */
export function PhotoGallery({ images, alt }: Props) {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          borderRadius: 8,
          background: '#f6f6f7',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {images.map((src, i) => (
          <img
            key={i}
            src={resolveImage(src)}
            alt={`${alt} — photo ${i + 1}`}
            style={{
              flex: '0 0 100%',
              width: '100%',
              height: 320,
              objectFit: 'contain',
              scrollSnapAlign: 'center',
              display: 'block',
            }}
          />
        ))}
      </div>

      {images.length > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            marginTop: 10,
          }}
        >
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to photo ${i + 1}`}
              onClick={() => goTo(i)}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: i === index ? '#303030' : '#c9ced6',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
