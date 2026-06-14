import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { getDb, isFirebaseConfigured } from '../firebase';
import { isKnownLayoutAreaSize } from '../constants/areaSizeOptions';
import type { House } from '../types';
import { mapHouse, houseCoverPhoto, houseLocationLine } from '../lib/mapHouse';
import { formatDateOnly } from '../format';

export function HomePage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const q = query(collection(getDb(), 'houses'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const list: House[] = [];
        snap.forEach((docSnap) => {
          list.push(mapHouse(docSnap.id, docSnap.data() as Record<string, unknown>));
        });
        if (!cancelled) {
          setHouses(list);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '読み込みに失敗しました。');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isFirebaseConfigured) {
    return (
      <section className="panel">
        <h1>物件一覧</h1>
        <p>Firebase を設定すると一覧が表示されます。</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="panel">
        <h1>物件一覧</h1>
        <p>読み込み中…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel">
        <h1>物件一覧</h1>
        <p className="text-error">{error}</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h1>物件一覧</h1>
      {houses.length === 0 ? (
        <div className="stack">
          <p>まだ物件がありません。</p>
          <p className="muted">大家さんから登録されるとここに表示されます。</p>
        </div>
      ) : (
        <ul className="house-list">
          {houses.map((h) => {
            const cover = houseCoverPhoto(h);
            return (
            <li key={h.id}>
              <Link to={`/houses/${h.id}`} className="house-card">
                <span className="house-card-main">
                  <span className="house-title">{h.title || '（無題）'}</span>
                  <span className="muted house-card-meta">
                    {[
                      houseLocationLine(h),
                      h.rent ? `家賃 ${h.rent}` : '',
                      isKnownLayoutAreaSize(h.areaSize) ? h.areaSize : '',
                      formatDateOnly(h.createdAt),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    className="house-card-thumb"
                    width={112}
                    height={80}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="house-card-thumb house-card-thumb--empty" aria-hidden />
                )}
              </Link>
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
