import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { House } from '../types';
import { useListProgress } from '../context/PageTitleContext';
import { houseCoverPhoto } from '../lib/mapHouse';
import { clampCarouselIndex, houseListSummaryLines } from '../lib/houseListSummary';
import { HouseListPropertySummary } from './HouseListPropertySummary';

const SWIPE_THRESHOLD_PX = 50;

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
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);

  useListProgress(count > 0 ? { current: safeIndex + 1, total: count } : null);

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

  function onTouchStart(e: React.TouchEvent) {
    const t = e.changedTouches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    swipedRef.current = false;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || count < 2) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;

    swipedRef.current = true;
    if (dx > 0 && canGoPrev) goPrev();
    if (dx < 0 && canGoNext) goNext();
  }

  function onClickCapture(e: React.MouseEvent) {
    if (!swipedRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    swipedRef.current = false;
  }

  return (
    <section
      className="house-carousel"
      aria-label="物件一覧"
      aria-live="polite"
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClickCapture={onClickCapture}
      tabIndex={-1}
    >
      {count > 1 ? (
        <p className="house-carousel-swipe-hint">左右スワイプで他物件が見れます</p>
      ) : null}

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
          <p className="house-carousel-meta">
            <span className="house-carousel-title">{summary.title}</span>
            <span className="house-carousel-date muted">掲載: {summary.listedDate}</span>
          </p>
          <HouseListPropertySummary house={house} />
        </div>
      </Link>
    </section>
  );
}
