import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import { Link, useParams } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';
import { getDb, getFns, isFirebaseConfigured } from '../firebase';
import { isKnownLayoutAreaSize } from '../constants/areaSizeOptions';
import { HousePhotoGrid } from '../components/HousePhotoGrid';
import type { House, HousePhoto, Inquiry } from '../types';
import { mapHouse, houseLocationLine } from '../lib/mapHouse';
import { loadHousePhotosForDisplay, photoUrlsFromList } from '../lib/housePhotos';
import { formatDate } from '../format';
import { usePageHeader } from '../context/PageTitleContext';
import { houseDetailHeaderCrumbs } from '../lib/pageHeaderCrumbs';

function mapInquiry(id: string, data: Record<string, unknown>): Inquiry {
  return {
    id,
    message: String(data.message ?? ''),
    createdAt: (data.createdAt as Inquiry['createdAt']) ?? null,
  };
}

export function HouseDetailPage() {
  const { houseId } = useParams();
  const [house, setHouse] = useState<House | null | undefined>(undefined);
  const [photos, setPhotos] = useState<HousePhoto[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  usePageHeader(houseDetailHeaderCrumbs(house));

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !houseId) {
      setHouse(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const ref = doc(getDb(), 'houses', houseId);
        const houseSnap = await getDoc(ref);
        if (!houseSnap.exists) {
          if (!cancelled) {
            setHouse(null);
            setPhotos([]);
            setInquiries([]);
          }
          return;
        }

        const houseData = houseSnap.data() as Record<string, unknown>;
        const h = mapHouse(houseSnap.id, houseData);
        const photoList = await loadHousePhotosForDisplay(houseId, houseData);
        const iq = query(
          collection(getDb(), 'houses', houseId, 'inquiries'),
          orderBy('createdAt', 'desc')
        );
        const iqSnap = await getDocs(iq);
        const list: Inquiry[] = [];
        iqSnap.forEach((d) => {
          list.push(mapInquiry(d.id, d.data() as Record<string, unknown>));
        });

        if (!cancelled) {
          setHouse(h);
          setPhotos(photoList);
          setInquiries(list);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : '読み込みに失敗しました。');
          setHouse(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [houseId]);

  async function onSubmitInquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!isFirebaseConfigured || !houseId) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitOk(false);
    try {
      const fn = httpsCallable<
        { houseId: string; message: string },
        { inquiryId: string }
      >(getFns(), 'submitInquiry');
      await fn({
        houseId,
        message: message.trim(),
      });
      setMessage('');
      setSubmitOk(true);

      const iq = query(
        collection(getDb(), 'houses', houseId, 'inquiries'),
        orderBy('createdAt', 'desc')
      );
      const iqSnap = await getDocs(iq);
      const list: Inquiry[] = [];
      iqSnap.forEach((d) => {
        list.push(mapInquiry(d.id, d.data() as Record<string, unknown>));
      });
      setInquiries(list);
    } catch (err) {
      if (err instanceof FirebaseError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('送信に失敗しました。');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!isFirebaseConfigured) {
    return (
      <section className="panel">
        <p>Firebase を設定してください。</p>
        <Link to="/">物件一覧へ</Link>
      </section>
    );
  }

  if (!houseId) {
    return (
      <section className="panel">
        <p>物件 ID がありません。</p>
        <Link to="/">物件一覧へ</Link>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="panel">
        <p className="text-error">{loadError}</p>
        <Link to="/">物件一覧へ</Link>
      </section>
    );
  }

  if (house === undefined) {
    return (
      <section className="panel">
        <p>読み込み中…</p>
      </section>
    );
  }

  if (house === null) {
    return (
      <section className="panel">
        <Link to="/">物件一覧へ</Link>
      </section>
    );
  }

  return (
    <article className="panel">
      <p className="muted house-detail-date">掲載: {formatDate(house.createdAt)}</p>
      {houseLocationLine(house) ||
      house.rent ||
      (house.areaSize && isKnownLayoutAreaSize(house.areaSize)) ? (
        <p className="muted small">
          {[
            houseLocationLine(house),
            house.rent ? `家賃 ${house.rent}` : '',
            isKnownLayoutAreaSize(house.areaSize) ? house.areaSize : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}
      {photos.length > 0 ? (
        <HousePhotoGrid photos={photoUrlsFromList(photos)} title={house.title} />
      ) : null}
      <div className="prose">
        {house.description ? (
          <p style={{ whiteSpace: 'pre-wrap' }}>{house.description}</p>
        ) : (
          <p className="muted">説明文はありません。</p>
        )}
      </div>

      <section className="stack-lg" aria-labelledby="inquiry-message-label">
        <form className="stack" onSubmit={onSubmitInquiry}>
          <label className="field inquiry-field" htmlFor="inquiry-message">
            <span id="inquiry-message-label">メッセージ</span>
            <textarea
              id="inquiry-message"
              className="inquiry-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
              maxLength={2000}
            />
          </label>
          {submitError ? <p className="text-error">{submitError}</p> : null}
          {submitOk ? <p className="text-success">送信しました。</p> : null}
          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? '送信中…' : '送信'}
          </button>
        </form>

        <p className="muted small">
          下記の問い合わせ板は誰でも閲覧可能です。個人情報の記載にはご配慮下さい。
        </p>

        {inquiries.length === 0 ? (
          <p className="muted">まだ問い合わせはありません。</p>
        ) : (
          <ul className="inquiry-list">
            {inquiries.map((q) => (
              <li key={q.id} className="inquiry-item">
                <div className="inquiry-meta">
                  <span className="muted">{formatDate(q.createdAt)}</span>
                </div>
                <p style={{ whiteSpace: 'pre-wrap' }}>{q.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
