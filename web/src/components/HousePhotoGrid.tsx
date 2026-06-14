import { useEffect, useState } from 'react';

type Props = {
  photos: string[];
  title: string;
};

export function HousePhotoGrid({ photos, title }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const altBase = title ? `${title}の画像` : '物件の画像';
  const count = photos.length;

  useEffect(() => {
    if (lightboxIndex === null) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
        return;
      }
      if (count <= 1) return;
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
      }
      if (e.key === 'ArrowRight') {
        setLightboxIndex((i) => (i !== null && i < count - 1 ? i + 1 : i));
      }
    }

    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxIndex, count]);

  if (count === 0) return null;

  const openUrl = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <>
      <ul className="house-photo-grid" aria-label={`${altBase}（${count}枚）`}>
        {photos.map((url, i) => (
          <li key={`${i}-${url}`} className="house-photo-grid-item">
            <button
              type="button"
              className="house-photo-grid-open"
              onClick={() => setLightboxIndex(i)}
              aria-label={`${altBase}（${i + 1}/${count}）を拡大表示`}
            >
              <img
                src={url}
                alt=""
                loading={i < 3 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </button>
          </li>
        ))}
      </ul>

      {openUrl !== null && lightboxIndex !== null ? (
        <div
          className="house-photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${altBase}（${lightboxIndex + 1}/${count}）`}
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            className="house-photo-lightbox-close"
            onClick={() => setLightboxIndex(null)}
            aria-label="閉じる"
          >
            ×
          </button>
          {count > 1 ? (
            <>
              <button
                type="button"
                className="house-photo-lightbox-nav house-photo-lightbox-nav--prev"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
                }}
                disabled={lightboxIndex === 0}
                aria-label="前の写真"
              >
                ‹
              </button>
              <button
                type="button"
                className="house-photo-lightbox-nav house-photo-lightbox-nav--next"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i !== null && i < count - 1 ? i + 1 : i));
                }}
                disabled={lightboxIndex === count - 1}
                aria-label="次の写真"
              >
                ›
              </button>
              <span className="house-photo-lightbox-counter">
                {lightboxIndex + 1} / {count}
              </span>
            </>
          ) : null}
          <img
            className="house-photo-lightbox-img"
            src={openUrl}
            alt={`${altBase}（${lightboxIndex + 1}/${count}）`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
