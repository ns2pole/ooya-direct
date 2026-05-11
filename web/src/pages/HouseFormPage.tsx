import type { SinglePrefecture } from '@geolonia/japanese-addresses-v2';
import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  findPrefecture,
  getCityNamesForPrefecture,
  getPrefectureApi,
  getPrefectureNames,
  getTownNamesForPrefAndCity,
} from '../address/geolonia';
import { AutocompleteSelect } from '../components/AutocompleteSelect';
import { AREA_SIZE_OPTIONS } from '../constants/areaSizeOptions';
import {
  getDb,
  isFirebaseConfigured,
  messageForHouseFormSaveError,
  uploadHouseCoverImage,
} from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function HouseFormPage() {
  const { houseId } = useParams();
  const isNew = houseId === undefined;
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [city, setCity] = useState('');
  const [town, setTown] = useState('');
  const [rent, setRent] = useState('');
  const [areaSize, setAreaSize] = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prefsData, setPrefsData] = useState<SinglePrefecture[] | null>(null);
  const [prefList, setPrefList] = useState<string[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [loadingTowns, setLoadingTowns] = useState(false);
  const [addressLoadError, setAddressLoadError] = useState<string | null>(null);
  const [townCache, setTownCache] = useState<Record<string, string[]>>({});

  const cityList = useMemo(() => {
    if (!prefsData || !prefecture) return [];
    const p = findPrefecture(prefsData, prefecture);
    return p ? getCityNamesForPrefecture(p) : [];
  }, [prefsData, prefecture]);

  const townKey = prefecture && city ? `${prefecture}\t${city}` : '';
  const townList = townKey ? (townCache[townKey] ?? []) : [];

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  useEffect(() => {
    let cancelled = false;
    getPrefectureApi()
      .then((api) => {
        if (cancelled) return;
        setPrefsData(api.data);
        setPrefList(getPrefectureNames(api.data));
        setAddressLoadError(null);
      })
      .catch((e) => {
        if (!cancelled) {
          setAddressLoadError(e instanceof Error ? e.message : '住所マスタの取得に失敗しました。');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPrefs(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!townKey) return;
    if (townCache[townKey] !== undefined) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 町字 fetch の開始を UI に反映
    setLoadingTowns(true);
    getTownNamesForPrefAndCity(prefecture, city)
      .then((names) => {
        if (cancelled) return;
        setTownCache((prev) => ({ ...prev, [townKey]: names }));
      })
      .catch(() => {
        if (cancelled) return;
        setTownCache((prev) => ({ ...prev, [townKey]: [] }));
      })
      .finally(() => {
        if (!cancelled) setLoadingTowns(false);
      });
    return () => {
      cancelled = true;
    };
  }, [townKey, prefecture, city, townCache]);

  useEffect(() => {
    if (!isFirebaseConfigured || isNew || !houseId || !user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 編集モードで一覧から入らない場合のガード
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
          setPrefecture(String(data.prefecture ?? ''));
          setCity(String(data.city ?? ''));
          setTown(String(data.town ?? ''));
          setRent(String(data.rent ?? ''));
          setAreaSize(String(data.areaSize ?? ''));
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
          prefecture: prefecture.trim(),
          city: city.trim(),
          town: town.trim(),
          rent: rent.trim(),
          areaSize: areaSize.trim(),
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
        showToast('物件を登録しました。', 'success');
        navigate(`/landlord/houses/${ref.id}/edit`);
      } else if (houseId) {
        const payload: Record<string, unknown> = {
          title: title.trim(),
          description: description.trim(),
          prefecture: prefecture.trim(),
          city: city.trim(),
          town: town.trim(),
          rent: rent.trim(),
          areaSize: areaSize.trim(),
          updatedAt: serverTimestamp(),
        };
        if (coverFile) {
          payload.photoUrl = await uploadHouseCoverImage(houseId, coverFile);
        }
        await updateDoc(doc(getDb(), 'houses', houseId), payload);
        showToast('保存しました。', 'success');
        navigate('/landlord');
      }
    } catch (err) {
      const msg = messageForHouseFormSaveError(err);
      setError(msg);
      showToast(msg, 'error');
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
        {addressLoadError ? (
          <p className="muted small" style={{ margin: 0 }}>
            住所候補の取得に失敗しました: {addressLoadError}（手入力のまま保存できます）
          </p>
        ) : null}
        <AutocompleteSelect
          label="都道府県"
          value={prefecture}
          onChange={(next) => {
            setPrefecture(next);
            setCity('');
            setTown('');
          }}
          options={prefList}
          loading={loadingPrefs}
          placeholder="例: 東京都"
        />
        <AutocompleteSelect
          label="市区町村"
          value={city}
          onChange={(next) => {
            setCity(next);
            setTown('');
          }}
          options={cityList}
          disabled={!prefecture}
          placeholder={prefecture ? '例: 新宿区' : '先に都道府県を選んでください'}
        />
        <AutocompleteSelect
          label="町名（大字・丁目など）"
          value={town}
          onChange={setTown}
          options={townList}
          disabled={!prefecture || !city}
          loading={loadingTowns}
          placeholder={city ? '候補から選ぶか入力' : '先に市区町村を選んでください'}
          hint={
            prefecture && city && townList.length === 0 && !loadingTowns
              ? 'この市区町村には町字データがありません。直接入力してください。'
              : undefined
          }
        />
        <label className="field">
          <span>家賃</span>
          <input
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            maxLength={50}
            placeholder="例: 8.5万円"
          />
        </label>
        <label className="field">
          <span>広さ</span>
          <select value={areaSize} onChange={(e) => setAreaSize(e.target.value)}>
            <option value="">選択してください（任意）</option>
            {AREA_SIZE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
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
