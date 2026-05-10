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
import type { House, Inquiry } from '../types';
import { formatDate } from '../format';

function mapHouse(id: string, data: Record<string, unknown>): House {
  const rawPhoto = data.photoUrl;
  const photoUrl =
    typeof rawPhoto === 'string' && rawPhoto.trim() !== '' ? rawPhoto.trim() : null;
  return {
    id,
    ownerId: String(data.ownerId ?? ''),
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    photoUrl,
    createdAt: (data.createdAt as House['createdAt']) ?? null,
    updatedAt: (data.updatedAt as House['updatedAt']) ?? null,
  };
}

function mapInquiry(id: string, data: Record<string, unknown>): Inquiry {
  return {
    id,
    message: String(data.message ?? ''),
    displayName: data.displayName == null ? null : String(data.displayName),
    createdAt: (data.createdAt as Inquiry['createdAt']) ?? null,
  };
}

export function HouseDetailPage() {
  const { houseId } = useParams();
  const [house, setHouse] = useState<House | null | undefined>(undefined);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [message, setMessage] = useState('');
  const [displayName, setDisplayName] = useState('');
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
            setInquiries([]);
          }
          return;
        }

        const h = mapHouse(houseSnap.id, houseSnap.data() as Record<string, unknown>);
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
        { houseId: string; message: string; displayName?: string | null },
        { inquiryId: string }
      >(getFns(), 'submitInquiry');
      await fn({
        houseId,
        message: message.trim(),
        displayName: displayName.trim() || null,
      });
      setMessage('');
      setDisplayName('');
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
        <h1>物件が見つかりません</h1>
        <Link to="/">物件一覧へ</Link>
      </section>
    );
  }

  return (
    <article className="panel">
      <p className="breadcrumb">
        <Link to="/">物件一覧</Link>
        <span aria-hidden="true"> / </span>
        <span>{house.title || '物件詳細'}</span>
      </p>
      <h1>{house.title || '（無題）'}</h1>
      <p className="muted">掲載: {formatDate(house.createdAt)}</p>
      {house.photoUrl ? (
        <div className="house-hero">
          <img
            src={house.photoUrl}
            alt={house.title ? `${house.title}の画像` : '物件の画像'}
            className="house-hero-img"
            width={800}
            height={450}
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : null}
      <div className="prose">
        {house.description ? (
          <p style={{ whiteSpace: 'pre-wrap' }}>{house.description}</p>
        ) : (
          <p className="muted">説明文はありません。</p>
        )}
      </div>

      <section className="stack-lg" aria-labelledby="inquiries-heading">
        <h2 id="inquiries-heading">公開の問い合わせ</h2>
        <p className="muted small">
          メルカリの商品コメントのように、誰でも閲覧できます。個人情報（電話・メール・住所など）は書かないでください。
        </p>

        {inquiries.length === 0 ? (
          <p className="muted">まだ問い合わせはありません。</p>
        ) : (
          <ul className="inquiry-list">
            {inquiries.map((q) => (
              <li key={q.id} className="inquiry-item">
                <div className="inquiry-meta">
                  <strong>{q.displayName || '匿名'}</strong>
                  <span className="muted">{formatDate(q.createdAt)}</span>
                </div>
                <p style={{ whiteSpace: 'pre-wrap' }}>{q.message}</p>
              </li>
            ))}
          </ul>
        )}

        <form className="stack" onSubmit={onSubmitInquiry}>
          <h3>問い合わせを送る（ログイン不要）</h3>
          <label className="field">
            <span>表示名（任意）</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              autoComplete="nickname"
            />
          </label>
          <label className="field">
            <span>メッセージ</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
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
      </section>
    </article>
  );
}
