import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { House } from '../types';
import { useListProgress } from '../context/PageTitleContext';
import { listHousePhotos } from '../lib/housePhotos';
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
  const houseId = house?.id ?? '';
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);

  useEffect(() => {
    setSelectedPhoto(0);
    setPhotoUrls([]);
    if (!houseId) return;
    let cancelled = false;
    listHousePhotos(houseId)
      .then((photos) => {
        if (cancelled) return;
        setPhotoUrls(photos.map((photo) => photo.url).filter((url) => url.length > 0));
      })
      .catch(() => {
        if (!cancelled) setPhotoUrls([]);
      });
    return () => {
      cancelled = true;
    };
  }, [houseId]);

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
  const gallery = photoUrls.length > 0 ? photoUrls : cover ? [cover] : [];
  const selectedIndex = gallery.length === 0 ? 0 : Math.min(selectedPhoto, gallery.length - 1);
  const mainUrl = gallery[selectedIndex] ?? null;
  const thumbs =
    gallery.length > 1
      ? gallery.map((url, index) => ({ url, index })).filter((item) => item.index !== selectedIndex)
      : [];

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
    if ((e.target as HTMLElement).closest('.house-carousel-thumbs')) return;
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
    if ((e.target as HTMLElement).closest('.house-carousel-thumbs')) {
      touchStartRef.current = null;
      return;
    }
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
        <div className="house-carousel-hint-row">
          <button
            type="button"
            className="house-carousel-nav house-carousel-nav--prev"
            aria-label="前の物件"
            disabled={!canGoPrev}
            onClick={goPrev}
          >
            <span className="house-carousel-nav-mark" aria-hidden="true">
              ▼
            </span>
          </button>
          <p className="house-carousel-swipe-hint">
            <span className="house-carousel-swipe-hint-em">メイン画像タップ</span>
            で詳細、
            <span className="house-carousel-swipe-hint-em">左右スワイプ</span>
            で他物件へ
          </p>
          <button
            type="button"
            className="house-carousel-nav house-carousel-nav--next"
            aria-label="次の物件"
            disabled={!canGoNext}
            onClick={goNext}
          >
            <span className="house-carousel-nav-mark" aria-hidden="true">
              ▼
            </span>
          </button>
        </div>
      ) : null}

      <div className="house-carousel-card">
        <Link
          to={`/houses/${house.id}`}
          className="house-carousel-card-main"
          aria-label={`${summary.title}の写真`}
        >
          <div className="house-carousel-hero">
            {mainUrl ? (
              <img
                src={mainUrl}
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
        </Link>
        {thumbs.length > 0 ? (
          <div className="house-carousel-thumbs" aria-label="ほかの写真">
            {thumbs.map((item) => (
              <button
                key={`${item.index}-${item.url}`}
                type="button"
                className="house-carousel-thumb"
                aria-label={`${item.index + 1}枚目を表示`}
                onClick={() => setSelectedPhoto(item.index)}
              >
                <img src={item.url} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        ) : null}
        <Link to={`/houses/${house.id}`} className="house-carousel-title">
          {summary.title}
        </Link>
        <div className="house-carousel-body">
          <HousePropertyTable house={house} />
        </div>
      </div>
    </section>
  );
}
