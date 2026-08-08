import type { SinglePrefecture } from '@geolonia/japanese-addresses-v2';
import { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  findPrefecture,
  getCityNamesForPrefecture,
  getPrefectureApi,
  getPrefectureNames,
  getTownNamesForPrefAndCity,
} from '../address/geolonia';
import { AutocompleteSelect } from '../components/AutocompleteSelect';
import { HouseFormPhotoSection } from '../components/HouseFormPhotoSection';
import { HousePropertyFormFields } from '../components/HousePropertyFormFields';
import { getDb, isFirebaseConfigured, messageForHouseFormSaveError } from '../firebase';
import {
  listHousePhotos,
  loadHousePhotosForDisplay,
  progressStepLabel,
  saveHouseWithPhotos,
} from '../lib/housePhotos';
import { releasePhotoPreviewUrl, type PendingPhotoEntry } from '../lib/photoFileSelection';
import { useAuth } from '../context/AuthContext';
import { usePageHeader } from '../context/PageTitleContext';
import { houseFormHeaderCrumbs } from '../lib/pageHeaderCrumbs';
import { useToast } from '../context/ToastContext';
import {
  EMPTY_HOUSE_PROPERTY_FIELDS,
  readHousePropertyFields,
  type HousePropertyFields,
  housePropertyFieldsToPayload,
} from '../lib/housePropertyFields';
import { isKnownLayoutAreaSize } from '../constants/areaSizeOptions';
import type { HousePhoto } from '../types';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

type EditNavState = {
  photosAfterSave?: HousePhoto[];
};

export function HouseFormPage() {
  const { houseId } = useParams();
  const isNew = houseId === undefined;
  usePageHeader(houseFormHeaderCrumbs(isNew));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [city, setCity] = useState('');
  const [town, setTown] = useState('');
  const [propertyFields, setPropertyFields] = useState<HousePropertyFields>(
    EMPTY_HOUSE_PROPERTY_FIELDS
  );
  const [existingPhotos, setExistingPhotos] = useState<HousePhoto[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<Set<string>>(() => new Set());
  const [pendingPhotos, setPendingPhotos] = useState<{ file: File; previewUrl: string }[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveStatusMessage, setSaveStatusMessage] = useState('');

  const pendingPhotosRef = useRef(pendingPhotos);
  const existingPhotosRef = useRef(existingPhotos);
  const removedPhotoIdsRef = useRef(removedPhotoIds);
  const loadedHouseIdRef = useRef<string | null>(null);
  const navPhotosRef = useRef<HousePhoto[] | null>(
    (location.state as EditNavState | null)?.photosAfterSave ?? null
  );

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

  function pendingSources(): { file: File; previewUrl: string }[] {
    if (pendingPhotosRef.current.length >= pendingPhotos.length) {
      return pendingPhotosRef.current;
    }
    return pendingPhotos.length > 0 ? pendingPhotos : pendingPhotosRef.current;
  }

  function getPendingFiles(): File[] {
    return pendingSources().map((p) => p.file);
  }

  function releasePreviewUrl(previewUrl: string) {
    releasePhotoPreviewUrl(previewUrl);
  }


  function applyPhotosToForm(photos: HousePhoto[]) {
    existingPhotosRef.current = photos;
    setExistingPhotos(photos);
    const emptyRemoved = new Set<string>();
    removedPhotoIdsRef.current = emptyRemoved;
    setRemovedPhotoIds(emptyRemoved);
    clearPendingPhotos();
  }

  function onPropertyFieldChange(key: keyof HousePropertyFields, value: string) {
    setPropertyFields((prev) => ({ ...prev, [key]: value }));
  }

  function textFields() {
    return {
      title,
      description,
      prefecture,
      city,
      town,
      ...propertyFields,
    };
  }

  function showValidationError(msg: string) {
    setFormError(msg);
    setSaveStatus('error');
    setSaveStatusMessage(msg);
  }

  function resetSaveStatus() {
    setSaveStatus('idle');
    setSaveStatusMessage('');
  }

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
    const navPhotos = (location.state as EditNavState | null)?.photosAfterSave;
    if (navPhotos?.length) {
      navPhotosRef.current = navPhotos;
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 初回のみ navigation state を消費
  }, []);

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
        const navPhotos = navPhotosRef.current;
        const displayPhotos = navPhotos?.length ? navPhotos : photos;
        if (navPhotos?.length) navPhotosRef.current = null;
        if (!cancelled) {
          setTitle(String(data.title ?? ''));
          setDescription(String(data.description ?? ''));
          setPrefecture(String(data.prefecture ?? ''));
          setCity(String(data.city ?? ''));
          setTown(String(data.town ?? ''));
          const loadedProps = readHousePropertyFields(data);
          const rawArea = loadedProps.areaSize.trim();
          setPropertyFields({
            ...loadedProps,
            areaSize: isKnownLayoutAreaSize(rawArea) ? rawArea : '',
          });
          if (loadedHouseIdRef.current !== houseId) {
            pendingPhotosRef.current.forEach(({ previewUrl }) => releasePreviewUrl(previewUrl));
            pendingPhotosRef.current = [];
            setPendingPhotos([]);
            const emptyRemoved = new Set<string>();
            removedPhotoIdsRef.current = emptyRemoved;
            setRemovedPhotoIds(emptyRemoved);
            loadedHouseIdRef.current = houseId;
          }
          existingPhotosRef.current = displayPhotos;
          setExistingPhotos(displayPhotos);
          setLoadError(null);
          setFormError(null);
          resetSaveStatus();
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
  }, [houseId, isNew, user?.uid]);

  useEffect(() => {
    return () => {
      pendingPhotosRef.current.forEach(({ previewUrl }) => releasePreviewUrl(previewUrl));
    };
  }, []);

  const activeExistingPhotos = existingPhotos.filter((p) => !removedPhotoIds.has(p.id));

  function handlePendingChange(next: PendingPhotoEntry[]) {
    const added = next.length - pendingPhotos.length;
    setFormError(null);
    resetSaveStatus();
    pendingPhotosRef.current = next;
    setPendingPhotos(next);
    if (added > 0) {
      showToast(
        `${added}枚追加しました。下の「保存」ボタンを押すと登録されます。`,
        'success'
      );
    }
  }

  function onPhotoFilesError(msg: string) {
    showValidationError(msg);
    showToast(msg, 'error');
  }

  function removeExistingPhoto(photoId: string) {
    setRemovedPhotoIds((prev) => {
      const next = new Set(prev).add(photoId);
      removedPhotoIdsRef.current = next;
      return next;
    });
    resetSaveStatus();
  }

  function removePendingPhoto(index: number) {
    setPendingPhotos((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) releasePreviewUrl(removed.previewUrl);
      pendingPhotosRef.current = next;
      return next;
    });
    resetSaveStatus();
  }

  function clearPendingPhotos() {
    setPendingPhotos((prev) => {
      prev.forEach(({ previewUrl }) => releasePreviewUrl(previewUrl));
      pendingPhotosRef.current = [];
      return [];
    });
  }

  function saveSuccessMessage(photoCount: number): string {
    if (photoCount > 0) {
      return `保存完了（写真 ${photoCount} 枚）`;
    }
    return '保存完了';
  }

  function onFormInvalid(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    showValidationError('入力内容を確認してください（タイトルは必須です）。');
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    if (!form.reportValidity()) {
      showValidationError('入力内容を確認してください（タイトルは必須です）。');
      return;
    }

    if (!user) {
      showValidationError('ログインが必要です。再度ログインしてください。');
      return;
    }

    if (!isFirebaseConfigured) {
      showValidationError('Firebase が未設定です。環境変数を確認してください。');
      return;
    }

    setSaving(true);
    setFormError(null);
    setSaveStatus('saving');
    setSaveStatusMessage('保存を開始しています…');

    const pendingFiles = getPendingFiles();
    const removedIds = removedPhotoIdsRef.current;
    const photoChanged = removedIds.size > 0 || pendingFiles.length > 0;
    const expectedNewPhotos = pendingFiles.length;

    try {
      if (isNew) {
        const ref = await addDoc(collection(getDb(), 'houses'), {
          ownerId: user.uid,
          title: title.trim(),
          description: description.trim(),
          prefecture: prefecture.trim(),
          city: city.trim(),
          town: town.trim(),
          ...housePropertyFieldsToPayload(propertyFields),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        let saved: HousePhoto[] = [];
        if (photoChanged) {
          saved = await saveHouseWithPhotos({
            houseId: ref.id,
            ownerId: user.uid,
            textFields: textFields(),
            existing: [],
            removedIds: new Set(),
            pendingFiles,
            photoChanged: true,
            onProgress: (step, detail) => {
              setSaveStatusMessage(progressStepLabel(step, detail));
            },
          });
        }

        const msg =
          saved.length > 0
            ? `物件を登録しました（写真 ${saved.length} 枚）`
            : expectedNewPhotos > 0
              ? '物件は登録しましたが、写真が保存されませんでした。もう一度ファイルを選んで保存してください。'
              : '物件を登録しました';
        if (saved.length > 0) {
          setSaveStatus('success');
        } else if (expectedNewPhotos > 0) {
          setSaveStatus('error');
          setFormError(msg);
        } else {
          setSaveStatus('success');
        }
        setSaveStatusMessage(msg);
        showToast(msg, saved.length > 0 || expectedNewPhotos === 0 ? 'success' : 'error');
        navigate(`/landlord/houses/${ref.id}/edit`, {
          state: saved.length > 0 ? { photosAfterSave: saved } : null,
        });
      } else if (houseId) {
        const saved = await saveHouseWithPhotos({
          houseId,
          ownerId: user.uid,
          textFields: textFields(),
          existing: existingPhotosRef.current,
          removedIds,
          pendingFiles,
          photoChanged,
          onProgress: (step, detail) => {
            setSaveStatusMessage(progressStepLabel(step, detail));
          },
        });
        const reloaded = await listHousePhotos(houseId);
        const displayPhotos = reloaded.length > 0 ? reloaded : saved;
        applyPhotosToForm(displayPhotos);
        let msg = saveSuccessMessage(displayPhotos.length);
        if (expectedNewPhotos > 0 && displayPhotos.length === 0) {
          msg =
            '保存は完了しましたが、写真が登録されませんでした。ファイルを選び直して再度保存してください。';
          setSaveStatus('error');
          setFormError(msg);
          showToast(msg, 'error');
        } else {
          setSaveStatus('success');
          showToast(msg, 'success');
        }
        setSaveStatusMessage(msg);
      }
    } catch (err) {
      const msg = messageForHouseFormSaveError(err);
      setFormError(msg);
      setSaveStatus('error');
      setSaveStatusMessage(msg);
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
      <form
        className="stack"
        onSubmit={(e) => void onSubmit(e)}
        onInvalid={onFormInvalid}
        noValidate={false}
      >
        <label className="field">
          <span>タイトル</span>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            rows={3}
            maxLength={200}
            placeholder="Enter で改行できます"
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
        <div className="field-row field-row--3">
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
            placeholder={prefecture ? '例: 新宿区' : '先に都道府県'}
          />
          <AutocompleteSelect
            label="町名（大字・丁目など）"
            value={town}
            onChange={setTown}
            options={townList}
            disabled={!prefecture || !city}
            loading={loadingTowns}
            placeholder={city ? '候補から選ぶか入力' : '先に市区町村'}
          />
        </div>
        {prefecture && city && townList.length === 0 && !loadingTowns ? (
          <p className="muted small" style={{ margin: 0 }}>
            この市区町村には町字データがありません。町名は直接入力してください。
          </p>
        ) : null}
        <HousePropertyFormFields fields={propertyFields} onChange={onPropertyFieldChange} />
        <HouseFormPhotoSection
          existingPhotos={activeExistingPhotos}
          pendingPhotos={pendingPhotos}
          onPendingChange={handlePendingChange}
          onRemoveExisting={removeExistingPhoto}
          onRemovePending={removePendingPhoto}
          onSelectionError={onPhotoFilesError}
        />

        {saveStatus !== 'idle' ? (
          <div
            className={`save-status save-status--${saveStatus}`}
            role="status"
            aria-live="polite"
          >
            {saveStatusMessage}
          </div>
        ) : null}

        {formError ? <p className="text-error">{formError}</p> : null}
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
