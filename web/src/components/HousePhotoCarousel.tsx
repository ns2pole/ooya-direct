import { useCallback, useState } from 'react';

type Props = {
  photos: string[];
  title: string;
};

export function HousePhotoCarousel({ photos, title }: Props) {
  const [index, setIndex] = useState(0);
  const count = photos.length;

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => (i < count - 1 ? i + 1 : i));
  }, [count]);

  if (count === 0) return null;

  const altBase = title ? `${title}の画像` : '物件の画像';

  return (
    <div className="house-carousel" aria-roledescription="carousel">
      <div className="house-carousel-viewport">
        <div
          className="house-carousel-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {photos.map((url, i) => (
            <img
              key={url}
              src={url}
              alt={count > 1 ? `${altBase}（${i + 1}/${count}）` : altBase}
              className="house-carousel-slide"
              width={800}
              height={450}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
            />
          ))}
        </div>
        {count > 1 ? (
          <>
            <button
              type="button"
              className="house-carousel-btn house-carousel-btn--prev"
              onClick={goPrev}
              disabled={index === 0}
              aria-label="前の写真"
            >
              ‹
            </button>
            <button
              type="button"
              className="house-carousel-btn house-carousel-btn--next"
              onClick={goNext}
              disabled={index === count - 1}
              aria-label="次の写真"
            >
              ›
            </button>
            <span className="house-carousel-counter" aria-live="polite">
              {index + 1} / {count}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
