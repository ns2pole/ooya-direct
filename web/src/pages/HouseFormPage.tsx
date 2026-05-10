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
import { getDb, isFirebaseConfigured, uploadHouseCoverImage } from '../firebase';
import { useAuth } from '../context/AuthContext';

export function HouseFormPage() {
  const { houseId } = useParams();
  const isNew = houseId === undefined;
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
          const p = data.photoUrl;
          setExistingPhotoUrl(
            typeof p === 'string' && p.trim() !== '' ? p.trim() : null
          );
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

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [coverPreviewUrl]);

  function onCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('画像ファイル（JPEG / PNG / GIF / WebP）を選んでください。');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('画像は 5MB 以下にしてください。');
      return;
    }
    setError(null);
    setCoverFile(file);
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

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
        if (coverFile) {
          const photoUrl = await uploadHouseCoverImage(ref.id, coverFile);
          await updateDoc(doc(getDb(), 'houses', ref.id), {
            photoUrl,
            updatedAt: serverTimestamp(),
          });
        }
        navigate(`/landlord/houses/${ref.id}/edit`);
      } else if (houseId) {
        const payload: Record<string, unknown> = {
          title: title.trim(),
          description: description.trim(),
          updatedAt: serverTimestamp(),
        };
        if (coverFile) {
          payload.photoUrl = await uploadHouseCoverImage(houseId, coverFile);
        }
        await updateDoc(doc(getDb(), 'houses', houseId), payload);
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
        <div className="field">
          <span>代表画像（任意・5MB 以下）</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={onCoverFileChange}
          />
          <p className="muted small" style={{ margin: 0 }}>
            物件一覧・詳細ページに表示されます。編集で選び直すと差し替わります。
          </p>
          {coverPreviewUrl ? (
            <div className="house-form-preview">
              <img src={coverPreviewUrl} alt="" width={280} height={160} />
            </div>
          ) : existingPhotoUrl ? (
            <div className="house-form-preview">
              <img src={existingPhotoUrl} alt="" width={280} height={160} />
            </div>
          ) : null}
        </div>
        {error ? <p className="text-error">{error}</p> : null}
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
