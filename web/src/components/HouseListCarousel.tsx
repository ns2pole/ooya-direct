import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { House } from '../types';
import { houseCoverPhoto } from '../lib/mapHouse';
import { clampCarouselIndex, houseListSummaryLines } from '../lib/houseListSummary';
import { HousePropertyTable } from './HousePropertyTable';

type Props = {
  houses: House[];
};

export function HouseListCarousel({ houses }: Props) {
  const [index, setIndex] = useState(0);
  const count = houses.length;
  const safeIndex = clampCarouselIndex(index, count);
  const house = houses[safeIndex];
  const summary = house ? houseListSummaryLines(house) : null;
  const cover = house ? houseCoverPhoto(house) : null;

  useEffect(() => {
    if (index !== safeIndex) {
      setIndex(safeIndex);
    }
  }, [index, safeIndex]);

  if (!house || !summary) {
    return null;
  }

  const canGoPrev = safeIndex > 0;
  const canGoNext = safeIndex < count - 1;

  function goPrev() {
    setIndex((i) => clampCarouselIndex(i - 1, count));
  }

  function goNext() {
    setIndex((i) => clampCarouselIndex(i + 1, count));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft' && canGoPrev) {
      e.preventDefault();
      goPrev();
    }
    if (e.key === 'ArrowRight' && canGoNext) {
      e.preventDefault();
      goNext();
    }
  }

  return (
    <section
      className="house-carousel"
      aria-label="物件一覧"
      aria-live="polite"
      onKeyDown={onKeyDown}
      tabIndex={-1}
    >
      <div className="house-carousel-nav">
        <button
          type="button"
          className="btn ghost house-carousel-nav-btn"
          aria-label="前の物件"
          disabled={!canGoPrev}
          onClick={goPrev}
        >
          ‹
        </button>
        <span className="house-carousel-counter" aria-live="polite">
          {safeIndex + 1} / {count}
        </span>
        <button
          type="button"
          className="btn ghost house-carousel-nav-btn"
          aria-label="次の物件"
          disabled={!canGoNext}
          onClick={goNext}
        >
          ›
        </button>
      </div>

      <Link to={`/houses/${house.id}`} className="house-carousel-card">
        <div className="house-carousel-hero">
          {cover ? (
            <img
              src={cover}
              alt=""
              className="house-carousel-hero-img"
              width={880}
              height={660}
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="house-carousel-hero-img house-carousel-hero-img--empty" aria-hidden />
          )}
        </div>
        <div className="house-carousel-body">
          <h2 className="house-carousel-title">{summary.title}</h2>
          <HousePropertyTable house={house} />
          <p className="muted house-carousel-date">掲載: {summary.listedDate}</p>
        </div>
      </Link>
    </section>
  );
}
