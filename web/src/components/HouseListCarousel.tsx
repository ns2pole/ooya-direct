import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { House } from '../types';
import { useListProgress } from '../context/PageTitleContext';
import { houseCoverPhoto } from '../lib/mapHouse';
import {
  HOUSE_LIST_QUERY_KEY,
  clampCarouselIndex,
  houseListSummaryLines,
  indexForHouseId,
} from '../lib/houseListSummary';
import { HousePropertyTable } from './HousePropertyTable';

const SWIPE_THRESHOLD_PX = 50;

type Props = {
  houses: House[];
};

export function HouseListCarousel({ houses }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const count = houses.length;
  const requestedId = searchParams.get(HOUSE_LIST_QUERY_KEY);
  const safeIndex = clampCarouselIndex(indexForHouseId(houses, requestedId), count);
  const house = houses[safeIndex];
  const summary = house ? houseListSummaryLines(house) : null;
  const cover = house ? houseCoverPhoto(house) : null;
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);

  useListProgress(
    count > 0 && summary
      ? { current: safeIndex + 1, total: count, listedDate: summary.listedDate }
      : null
  );

  // URL を選択中物件の source of truth に揃える（戻る・再表示用）
  useEffect(() => {
    if (!house) return;
    if (searchParams.get(HOUSE_LIST_QUERY_KEY) === house.id) return;
    const next = new URLSearchParams(searchParams);
    next.set(HOUSE_LIST_QUERY_KEY, house.id);
    setSearchParams(next, { replace: true });
  }, [house, searchParams, setSearchParams]);

  if (!house || !summary) {
    return null;
  }

  const canGoPrev = safeIndex > 0;
  const canGoNext = safeIndex < count - 1;

  function selectIndex(nextIndex: number) {
    const nextHouse = houses[clampCarouselIndex(nextIndex, count)];
    if (!nextHouse) return;
    const next = new URLSearchParams(searchParams);
    next.set(HOUSE_LIST_QUERY_KEY, nextHouse.id);
    setSearchParams(next, { replace: true });
  }

  function goPrev() {
    selectIndex(safeIndex - 1);
  }

  function goNext() {
    selectIndex(safeIndex + 1);
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
        <p className="house-carousel-swipe-hint">画像タップで詳細、左右スワイプで他物件が見れます。</p>
      ) : null}

      <div className="house-carousel-card">
        <Link to={`/houses/${house.id}`} className="house-carousel-card-main">
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
          <p className="house-carousel-title">{summary.title}</p>
        </Link>
        <div className="house-carousel-body">
          <HousePropertyTable house={house} />
        </div>
      </div>
    </section>
  );
}
