import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { getDb, isFirebaseConfigured } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { House } from '../types';
import { formatDate } from '../format';

function mapHouse(id: string, data: Record<string, unknown>): House {
  return {
    id,
    ownerId: String(data.ownerId ?? ''),
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    createdAt: (data.createdAt as House['createdAt']) ?? null,
    updatedAt: (data.updatedAt as House['updatedAt']) ?? null,
  };
}

export function LandlordPage() {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setHouses([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setListLoading(true);
      try {
        const q = query(
          collection(getDb(), 'houses'),
          where('ownerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const list: House[] = [];
        snap.forEach((d) => {
          list.push(mapHouse(d.id, d.data() as Record<string, unknown>));
        });
        if (!cancelled) {
          setHouses(list);
          setListError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setListError(e instanceof Error ? e.message : '一覧の取得に失敗しました。');
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function onDelete(h: House) {
    if (!user || h.ownerId !== user.uid) return;
    if (!window.confirm(`「${h.title || '無題'}」を削除しますか？`)) return;
    await deleteDoc(doc(getDb(), 'houses', h.id));
    setHouses((prev) => prev.filter((x) => x.id !== h.id));
  }

  if (!isFirebaseConfigured) {
    return (
      <section className="panel">
        <h1>大家さん</h1>
        <p>Firebase を設定するとログインできます。</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="panel">
        <h1>大家さん</h1>
        <p>認証状態を確認中…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="panel stack">
        <h1>大家さん</h1>
        <p>Google でログインすると、自分の物件を登録・編集できます。</p>
        <p className="muted small">
          Firebase コンソールで Authentication を有効化し、Google プロバイダをオンにしてください。
        </p>
        <button type="button" className="btn primary" onClick={() => void signInWithGoogle()}>
          Google でログイン
        </button>
      </section>
    );
  }

  return (
    <section className="panel stack-lg">
      <div className="row spread">
        <h1>マイ物件</h1>
        <div className="row">
          <span className="muted small">{user.email}</span>
          <button type="button" className="btn ghost" onClick={() => void signOutUser()}>
            ログアウト
          </button>
        </div>
      </div>

      <div className="row">
        <Link to="/landlord/houses/new" className="btn primary">
          新規登録
        </Link>
        <Link to="/" className="btn ghost">
          公開一覧を見る
        </Link>
      </div>

      {listLoading ? <p>読み込み中…</p> : null}
      {listError ? <p className="text-error">{listError}</p> : null}

      {!listLoading && houses.length === 0 ? (
        <p className="muted">まだ物件がありません。「新規登録」から追加してください。</p>
      ) : (
        <ul className="house-list">
          {houses.map((h) => (
            <li key={h.id} className="landlord-row">
              <div>
                <strong>{h.title || '（無題）'}</strong>
                <div className="muted small">{formatDate(h.updatedAt ?? h.createdAt)}</div>
              </div>
              <div className="row">
                <Link to={`/houses/${h.id}`} className="btn ghost">
                  公開ページ
                </Link>
                <Link to={`/landlord/houses/${h.id}/edit`} className="btn ghost">
                  編集
                </Link>
                <button type="button" className="btn danger" onClick={() => void onDelete(h)}>
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
