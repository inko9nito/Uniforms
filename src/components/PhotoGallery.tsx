import { useRef, useState } from 'react';
import { resolveImage } from '../data/inventory';

interface Props {
  images: string[];
  alt: string;
}

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
    <div style={{ position: 'relative', height: '100%' }}>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          height: '100%',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          background: '#fff',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
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
              height: '100%',
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
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
            pointerEvents: 'none',
          }}
        >
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to photo ${i + 1}`}
              onClick={() => goTo(i)}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                pointerEvents: 'auto',
                background: i === index ? '#fff' : 'rgba(255,255,255,0.5)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
