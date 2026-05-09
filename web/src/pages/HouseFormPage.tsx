import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { getDb, isFirebaseConfigured } from '../firebase';
import { useAuth } from '../context/AuthContext';

export function HouseFormPage() {
  const { houseId } = useParams();
  const isNew = houseId === undefined;
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || isNew || !houseId || !user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const ref = doc(getDb(), 'houses', houseId);
        const snap = await getDoc(ref);
        if (!snap.exists) {
          if (!cancelled) setError('物件が見つかりません。');
          return;
        }
        const data = snap.data() as Record<string, unknown>;
        if (String(data.ownerId) !== user.uid) {
          if (!cancelled) setError('この物件を編集する権限がありません。');
          return;
        }
        if (!cancelled) {
          setTitle(String(data.title ?? ''));
          setDescription(String(data.description ?? ''));
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
  }, [houseId, isNew, user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isFirebaseConfigured) return;
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const ref = await addDoc(collection(getDb(), 'houses'), {
          ownerId: user.uid,
          title: title.trim(),
          description: description.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        navigate(`/landlord/houses/${ref.id}/edit`);
      } else if (houseId) {
        await updateDoc(doc(getDb(), 'houses', houseId), {
          title: title.trim(),
          description: description.trim(),
          updatedAt: serverTimestamp(),
        });
        navigate('/landlord');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  if (!isFirebaseConfigured) {
    return (
      <section className="panel">
        <p>Firebase を設定してください。</p>
      </section>
    );
  }

  if (authLoading) {
    return (
      <section className="panel">
        <p>認証状態を確認中…</p>
      </section>
    );
  }

  if (!user) {
    return <Navigate to="/landlord" replace />;
  }

  if (!isNew && loading) {
    return (
      <section className="panel">
        <p>読み込み中…</p>
      </section>
    );
  }

  if (error && !isNew && !loading) {
    return (
      <section className="panel stack">
        <p className="text-error">{error}</p>
        <Link to="/landlord">マイ物件へ</Link>
      </section>
    );
  }

  return (
    <section className="panel stack-lg">
      <p className="breadcrumb">
        <Link to="/landlord">マイ物件</Link>
        <span aria-hidden="true"> / </span>
        <span>{isNew ? '新規登録' : '編集'}</span>
      </p>
      <h1>{isNew ? '物件の新規登録' : '物件の編集'}</h1>

      <form className="stack" onSubmit={(e) => void onSubmit(e)}>
        <label className="field">
          <span>タイトル</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
          />
        </label>
        <label className="field">
          <span>説明</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            maxLength={8000}
          />
        </label>
        {error && isNew ? <p className="text-error">{error}</p> : null}
        <div className="row">
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
          <Link to="/landlord" className="btn ghost">
            キャンセル
          </Link>
        </div>
      </form>
    </section>
  );
}
