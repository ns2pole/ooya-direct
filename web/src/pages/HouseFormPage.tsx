import type { SinglePrefecture } from '@geolonia/japanese-addresses-v2';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteField,
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
} from '../firebase';
import {
  loadHousePhotosForDisplay,
  MAX_HOUSE_PHOTOS,
  saveHousePhotos,
} from '../lib/housePhotos';
import { imageFileHint, isAllowedImageFile } from '../lib/imageFile';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { HousePhoto } from '../types';

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
  const [existingPhotos, setExistingPhotos] = useState<HousePhoto[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<Set<string>>(() => new Set());
  const [pendingPhotos, setPendingPhotos] = useState<{ file: File; previewUrl: string }[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const pendingPhotosRef = useRef(pendingPhotos);
  pendingPhotosRef.current = pendingPhotos;

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
          if (!cancelled) setLoadError('物件が見つかりません。');
          return;
        }
        const data = snap.data() as Record<string, unknown>;
        if (String(data.ownerId) !== user.uid) {
          if (!cancelled) setLoadError('この物件を編集する権限がありません。');
          return;
        }
        const photos = await loadHousePhotosForDisplay(houseId, data);
        if (!cancelled) {
          setTitle(String(data.title ?? ''));
          setDescription(String(data.description ?? ''));
          setPrefecture(String(data.prefecture ?? ''));
          setCity(String(data.city ?? ''));
          setTown(String(data.town ?? ''));
          setRent(String(data.rent ?? ''));
          const rawArea = String(data.areaSize ?? '').trim();
          setAreaSize(AREA_SIZE_OPTIONS.includes(rawArea) ? rawArea : '');
          setExistingPhotos(photos);
          setRemovedPhotoIds(new Set());
          setPendingPhotos([]);
          setLoadError(null);
          setFormError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : '読み込みに失敗しました。');
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
      pendingPhotosRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    };
  }, []);

  const activeExistingPhotos = existingPhotos.filter((p) => !removedPhotoIds.has(p.id));
  const totalPhotoCount = activeExistingPhotos.length + pendingPhotos.length;
  const pendingPhotoCount = pendingPhotos.length;

  function onPhotoFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = '';
    if (!files?.length) return;

    const additions: { file: File; previewUrl: string }[] = [];
    for (const file of Array.from(files)) {
      if (!isAllowedImageFile(file)) {
        const msg = `画像ファイル（${imageFileHint()}）を選んでください。`;
        setFormError(msg);
        showToast(msg, 'error');
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        const msg = '画像は 5MB 以下にしてください。';
        setFormError(msg);
        showToast(msg, 'error');
        return;
      }
      additions.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    const nextTotal = activeExistingPhotos.length + pendingPhotos.length + additions.length;
    if (nextTotal > MAX_HOUSE_PHOTOS) {
      additions.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      const msg = `写真は最大 ${MAX_HOUSE_PHOTOS} 枚までです。`;
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    setFormError(null);
    setPendingPhotos((prev) => [...prev, ...additions]);
    showToast(
      `${additions.length}枚追加しました。下の「保存」ボタンを押すと登録されます。`,
      'success'
    );
  }

  function removeExistingPhoto(photoId: string) {
    setRemovedPhotoIds((prev) => new Set(prev).add(photoId));
  }

  function removePendingPhoto(index: number) {
    setPendingPhotos((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  function clearPendingPhotos() {
    setPendingPhotos((prev) => {
      prev.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      return [];
    });
  }

  function applySavedPhotos(photos: HousePhoto[]) {
    setExistingPhotos(photos);
    setRemovedPhotoIds(new Set());
    clearPendingPhotos();
  }

  function houseTextFields(options?: { stripLegacyPhotos?: boolean }): Record<string, unknown> {
    const fields: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      prefecture: prefecture.trim(),
      city: city.trim(),
      town: town.trim(),
      rent: rent.trim(),
      areaSize: areaSize.trim(),
      updatedAt: serverTimestamp(),
    };
    if (options?.stripLegacyPhotos) {
      fields.photoUrl = deleteField();
      fields.photoUrls = deleteField();
    }
    return fields;
  }

  function saveSuccessMessage(photoCount: number): string {
    if (photoCount > 0) {
      return `保存しました（写真 ${photoCount} 枚）。`;
    }
    return '保存しました。';
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isFirebaseConfigured) return;
    setSaving(true);
    setFormError(null);
    try {
      const photoChanged = removedPhotoIds.size > 0 || pendingPhotos.length > 0;

      if (isNew) {
        const ref = await addDoc(collection(getDb(), 'houses'), {
          ownerId: user.uid,
          ...houseTextFields(),
          createdAt: serverTimestamp(),
        });
        let savedPhotoCount = 0;
        if (pendingPhotos.length > 0) {
          const saved = await saveHousePhotos(ref.id, {
            existing: [],
            removedIds: new Set(),
            pendingFiles: pendingPhotos.map((p) => p.file),
          });
          savedPhotoCount = saved.length;
        }
        showToast(
          savedPhotoCount > 0
            ? `物件を登録しました（写真 ${savedPhotoCount} 枚）。`
            : '物件を登録しました。',
          'success'
        );
        navigate(`/landlord/houses/${ref.id}/edit`);
      } else if (houseId) {
        await updateDoc(doc(getDb(), 'houses', houseId), houseTextFields({ stripLegacyPhotos: true }));
        let saved = activeExistingPhotos;
        if (photoChanged) {
          saved = await saveHousePhotos(houseId, {
            existing: existingPhotos,
            removedIds: removedPhotoIds,
            pendingFiles: pendingPhotos.map((p) => p.file),
          });
        }
        applySavedPhotos(saved);
        showToast(saveSuccessMessage(saved.length), 'success');
      }
    } catch (err) {
      const msg = messageForHouseFormSaveError(err);
      setFormError(msg);
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

  if (loadError && !isNew && !loading) {
    return (
      <section className="panel stack">
        <p className="text-error">{loadError}</p>
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
          <span>間取り</span>
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
          <span>写真（任意・各 5MB 以下・最大 {MAX_HOUSE_PHOTOS} 枚）</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            onChange={onPhotoFilesChange}
            disabled={totalPhotoCount >= MAX_HOUSE_PHOTOS}
          />
          <p className="muted small" style={{ margin: 0 }}>
            ファイルを選ぶと下にプレビューが増えます（「新規」バッジ付き）。
            <strong> 追加・削除は「保存」ボタンを押すまで確定しません。</strong>
            保存後、詳細ページで ‹ › ボタンで切り替えられます。
            {totalPhotoCount > 0
              ? ` 登録済み ${activeExistingPhotos.length} 枚` +
                (pendingPhotoCount > 0 ? ` + 追加予定 ${pendingPhotoCount} 枚` : '')
              : ''}
          </p>
          {totalPhotoCount > 0 ? (
            <ul className="house-form-photos">
              {activeExistingPhotos.map((photo) => (
                <li key={photo.id} className="house-form-photo-item">
                  <img src={photo.url} alt="" width={140} height={100} />
                  <button
                    type="button"
                    className="house-form-photo-remove"
                    onClick={() => removeExistingPhoto(photo.id)}
                    aria-label="この写真を削除"
                  >
                    削除
                  </button>
                </li>
              ))}
              {pendingPhotos.map(({ previewUrl, file }, i) => (
                <li key={previewUrl} className="house-form-photo-item">
                  <img src={previewUrl} alt="" width={140} height={100} />
                  <span className="house-form-photo-badge">新規</span>
                  <button
                    type="button"
                    className="house-form-photo-remove"
                    onClick={() => removePendingPhoto(i)}
                    aria-label={`${file.name} を削除`}
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {formError ? <p className="text-error">{formError}</p> : null}
        {pendingPhotoCount > 0 ? (
          <p className="text-success small" style={{ margin: 0 }}>
            追加予定 {pendingPhotoCount} 枚があります。「保存」を押してください。
          </p>
        ) : null}
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
