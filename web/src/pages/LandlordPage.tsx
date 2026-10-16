import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';
import { Link } from 'react-router-dom';
import { getDb, getFns, isFirebaseConfigured } from '../firebase';
import { deleteAllHousePhotos } from '../lib/housePhotos';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { housePropertyListChips } from '../lib/housePropertyFields';
import type { House, LandlordProfile } from '../types';
import { mapHouse, houseCoverPhoto } from '../lib/mapHouse';
import { formatDate, formatDateOnly } from '../format';
import { usePageTitle } from '../context/PageTitleContext';
import { lineAddFriendUrl } from '../lib/lineConfig';
import { LandlordBoard } from '../components/LandlordBoard';
import type { BoardHouse, BoardLandlord, BoardSource } from '../lib/landlordBoard';

function mapLandlordProfile(data: Record<string, unknown>): LandlordProfile {
  const lineUserId = data.lineUserId;
  return {
    lineUserId: typeof lineUserId === 'string' && lineUserId ? lineUserId : null,
    linkedAt: (data.linkedAt as LandlordProfile['linkedAt']) ?? null,
  };
}

function messageForCallableError(err: unknown): string {
  if (err instanceof FirebaseError) {
    return err.message;
  }
  return '処理に失敗しました。';
}

function messageForAuthCode(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'メールアドレスの形式が正しくありません。';
    case 'auth/user-disabled':
      return 'このアカウントは無効になっています。';
    case 'auth/operation-not-allowed':
      return 'メール/パスワードログインが Firebase で有効になっていません。コンソールの Authentication → Sign-in method を確認してください。';
    case 'auth/unauthorized-domain':
      return 'このドメインは Firebase の承認済みドメインに含まれていません。コンソールの Authentication → Settings → Authorized domains を確認してください。';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'メールアドレスまたはパスワードが正しくありません。';
    case 'auth/too-many-requests':
      return '試行回数が多すぎます。しばらくしてから再度お試しください。';
    case 'auth/network-request-failed':
      return '通信に失敗しました。接続を確認してください。';
    case 'auth/invalid-api-key':
      return 'Firebase の API キーが無効です。コンソールの「プロジェクトの設定」→「マイアプリ」で apiKey をコピーし直し、web/.env.local を更新して開発サーバーを再起動してください。Google Cloud の API キーにリファラー制限がある場合は localhost / 公開サイトのオリジンを許可してください。';
    default:
      return 'ログインに失敗しました。';
  }
}

type JimotySyncResult = {
  created: number;
  updated: number;
  removed: number;
  unchanged: number;
};

type JimotyStatus = JimotySyncResult & {
  lastSyncedAt: Timestamp | null;
};

function syncSummary(status: JimotySyncResult): string {
  return `新規 ${status.created}件、更新 ${status.updated}件、変化なし ${status.unchanged}件、成約のため削除 ${status.removed}件`;
}

export function LandlordPage() {
  const { user, loading, signInWithEmailPassword, signOutUser } = useAuth();
  const { showToast } = useToast();
  usePageTitle(user ? 'マイ物件' : '大家さん');
  const [houses, setHouses] = useState<House[]>([]);
  const [landlords, setLandlords] = useState<BoardLandlord[]>([]);
  const [sources, setSources] = useState<BoardSource[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [listVersion, setListVersion] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [jimotyStatus, setJimotyStatus] = useState<JimotyStatus | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [lineProfile, setLineProfile] = useState<LandlordProfile | null>(null);
  const [lineProfileLoading, setLineProfileLoading] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [unlinkSubmitting, setUnlinkSubmitting] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setLineProfile(null);
      setLineProfileLoading(false);
      return;
    }

    setLineProfileLoading(true);
    const ref = doc(getDb(), 'landlordProfiles', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setLineProfile(
          snap.exists()
            ? mapLandlordProfile(snap.data() as Record<string, unknown>)
            : { lineUserId: null, linkedAt: null }
        );
        setLineProfileLoading(false);
      },
      () => {
        setLineProfile({ lineUserId: null, linkedAt: null });
        setLineProfileLoading(false);
      }
    );

    return () => {
      unsub();
    };
  }, [user]);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setHouses([]);
      setLandlords([]);
      setSources([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setListLoading(true);
      try {
        const db = getDb();
        const [houseSnap, landlordSnap, sourceSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, 'houses'),
              where('ownerId', '==', user.uid),
              orderBy('createdAt', 'desc')
            )
          ),
          getDocs(query(collection(db, 'landlords'), where('ownerId', '==', user.uid))),
          getDocs(query(collection(db, 'portalSources'), where('ownerId', '==', user.uid))),
        ]);
        const list: House[] = [];
        houseSnap.forEach((d) => {
          list.push(mapHouse(d.id, d.data() as Record<string, unknown>));
        });
        const people: BoardLandlord[] = [];
        landlordSnap.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          people.push({ id: d.id, name: String(data.name ?? '') });
        });
        people.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
        const urls: BoardSource[] = [];
        sourceSnap.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          urls.push({
            id: d.id,
            landlordId: String(data.landlordId ?? ''),
            portal: String(data.portal ?? ''),
            url: String(data.url ?? ''),
          });
        });
        if (!cancelled) {
          setHouses(list);
          setLandlords(people);
          setSources(urls);
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
  }, [user, listVersion]);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setJimotyStatus(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(getDb(), 'settings', 'jimoty'));
        if (cancelled || !snap.exists()) {
          if (!cancelled) setJimotyStatus(null);
          return;
        }
        const data = snap.data();
        setJimotyStatus({
          lastSyncedAt: (data.lastSyncedAt as Timestamp | undefined) ?? null,
          created: Number(data.lastCreated ?? 0),
          updated: Number(data.lastUpdated ?? 0),
          removed: Number(data.lastRemoved ?? 0),
          unchanged: Number(data.lastUnchanged ?? 0),
        });
      } catch {
        if (!cancelled) setJimotyStatus(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, listVersion]);

  async function onSyncJimoty() {
    if (!user || syncing) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const fn = httpsCallable<Record<string, never>, JimotySyncResult>(
        getFns(),
        'syncJimotyNow'
      );
      const response = await fn({});
      const summary = syncSummary(response.data);
      showToast(`同期しました。${summary}`, 'success');
      setListVersion((version) => version + 1);
    } catch (err) {
      const message =
        err instanceof FirebaseError ? err.message : '同期に失敗しました。';
      setSyncError(message);
      showToast(message, 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      await signInWithEmailPassword(email, password);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      setLoginError(messageForAuthCode(code));
    } finally {
      setLoginSubmitting(false);
    }
  }

  async function onDeleteManualHouse(house: BoardHouse) {
    if (!user) return;
    await deleteAllHousePhotos(house.id);
    await deleteDoc(doc(getDb(), 'houses', house.id));
    setHouses((prev) => prev.filter((item) => item.id !== house.id));
  }

  async function onHideHouse(houseId: string, hidden: boolean) {
    try {
      await updateDoc(doc(getDb(), 'houses', houseId), {
        hidden,
        updatedAt: serverTimestamp(),
      });
      setHouses((prev) => prev.map((item) => (item.id === houseId ? { ...item, hidden } : item)));
    } catch (err) {
      const message = err instanceof FirebaseError ? err.message : '更新に失敗しました。';
      showToast(message, 'error');
    }
  }

  async function onAddLandlord(name: string) {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) throw new Error('名前を入力してください。');
    await addDoc(collection(getDb(), 'landlords'), {
      name: trimmed,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
    });
    setListVersion((version) => version + 1);
  }

  async function onRenameLandlord(landlordId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('名前を入力してください。');
    await updateDoc(doc(getDb(), 'landlords', landlordId), {
      name: trimmed,
      updatedAt: serverTimestamp(),
    });
    setLandlords((prev) =>
      prev.map((item) => (item.id === landlordId ? { ...item, name: trimmed } : item))
    );
  }

  async function onAddSource(landlordId: string, url: string) {
    const fn = httpsCallable<
      { landlordId: string; portal: string; url: string },
      { id: string }
    >(getFns(), 'registerPortalSource');
    await fn({ landlordId, portal: 'jimoty', url });
    setListVersion((version) => version + 1);
  }

  async function onDeleteSource(sourceId: string) {
    const fn = httpsCallable<{ sourceId: string }, { removed: number }>(
      getFns(),
      'deletePortalSource'
    );
    await fn({ sourceId });
    setListVersion((version) => version + 1);
  }

  async function onDeleteLandlord(landlordId: string) {
    const fn = httpsCallable<{ landlordId: string }, { removedHouses: number }>(
      getFns(),
      'deleteLandlord'
    );
    await fn({ landlordId });
    setListVersion((version) => version + 1);
  }

  function boardHouse(house: House): BoardHouse {
    return {
      id: house.id,
      title: house.title,
      landlordId: house.landlordId,
      sourceId: house.sourceId,
      fromSync: house.fromSync,
      hidden: house.hidden,
      meta: [...housePropertyListChips(house), formatDateOnly(house.updatedAt ?? house.createdAt)]
        .filter(Boolean)
        .join(' · '),
      coverPhotoUrl: houseCoverPhoto(house),
    };
  }

  async function onStartLineLink() {
    if (!user) return;
    setLinkSubmitting(true);
    setLinkError(null);
    try {
      const fn = httpsCallable<Record<string, never>, { code: string }>(
        getFns(),
        'startLineLink'
      );
      const result = await fn({});
      setLinkCode(result.data.code);
    } catch (err) {
      setLinkError(messageForCallableError(err));
    } finally {
      setLinkSubmitting(false);
    }
  }

  async function onUnlinkLine() {
    if (!user) return;
    if (!window.confirm('LINE 通知の連携を解除しますか？')) return;
    setUnlinkSubmitting(true);
    setLinkError(null);
    try {
      const fn = httpsCallable(getFns(), 'unlinkLine');
      await fn({});
      setLinkCode(null);
    } catch (err) {
      setLinkError(messageForCallableError(err));
    } finally {
      setUnlinkSubmitting(false);
    }
  }

  if (!isFirebaseConfigured) {
    return (
      <section className="panel">
        <p>Firebase を設定するとログインできます。</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="panel">
        <p>認証状態を確認中…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="panel stack">
        <p>ログイン ID とパスワードで、自分の物件を登録・編集できます。</p>
        <p className="muted small">
          Firebase コンソールで Authentication のメール/パスワードを有効化し、大家用ユーザーを作成してください。
        </p>
        <form className="stack" onSubmit={(ev) => void handleLoginSubmit(ev)}>
          <label className="field">
            <span>ログイン ID（メールアドレス）</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>パスワード</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
            />
          </label>
          {loginError ? <p className="text-error">{loginError}</p> : null}
          <button type="submit" className="btn primary" disabled={loginSubmitting}>
            {loginSubmitting ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="panel stack-lg">
      <div className="row">
        <span className="muted small">{user.email}</span>
        <button type="button" className="btn ghost" onClick={() => void signOutUser()}>
          ログアウト
        </button>
      </div>

      <div className="stack">
        <div className="row">
          <button
            type="button"
            className="btn primary"
            onClick={() => void onSyncJimoty()}
            disabled={syncing || sources.length === 0}
          >
            {syncing ? '同期中…' : '同期'}
          </button>
          <Link to="/" className="btn ghost">
            物件一覧
          </Link>
        </div>
        <p className="muted small">
          登録したURLの未成約だけを取り込みます。内容が変わった項目だけ上書きし、成約になった取り込み物件は削除します。非表示にした物件は同期でも戻りません。毎日
          23:00〜23:59 にも1回、登録URLをすべて同期します。
        </p>
        {jimotyStatus?.lastSyncedAt ? (
          <p className="muted small">
            最終同期: {formatDate(jimotyStatus.lastSyncedAt)}（
            {syncSummary(jimotyStatus)}）
          </p>
        ) : (
          <p className="muted small">まだ同期していません。</p>
        )}
        {syncError ? <p className="text-error">{syncError}</p> : null}
      </div>

      <section className="stack line-link-panel" aria-labelledby="line-link-heading">
        <h2 id="line-link-heading" className="line-link-heading">
          LINE 通知
        </h2>
        {lineProfileLoading ? (
          <p className="muted small">LINE 連携状態を確認中…</p>
        ) : lineProfile?.lineUserId ? (
          <div className="stack">
            <p className="text-success">LINE 通知: 連携済み</p>
            {lineProfile.linkedAt ? (
              <p className="muted small">
                連携日: {formatDateOnly(lineProfile.linkedAt)}
              </p>
            ) : null}
            <button
              type="button"
              className="btn ghost"
              disabled={unlinkSubmitting}
              onClick={() => void onUnlinkLine()}
            >
              {unlinkSubmitting ? '解除中…' : '連携を解除'}
            </button>
          </div>
        ) : (
          <div className="stack">
            <p className="muted small">
              問い合わせが届いたときに LINE で通知を受け取れます。
            </p>
            <ol className="muted small line-link-steps">
              <li>
                <a href={lineAddFriendUrl()} target="_blank" rel="noopener noreferrer">
                  LINE 公式アカウントを友だち追加
                </a>
              </li>
              <li>下のボタンで連携コードを発行（10分間有効）</li>
              <li>LINE のトークに6桁のコードを送信</li>
            </ol>
            <button
              type="button"
              className="btn primary"
              disabled={linkSubmitting}
              onClick={() => void onStartLineLink()}
            >
              {linkSubmitting ? '発行中…' : '連携コードを発行'}
            </button>
            {linkCode ? (
              <p>
                連携コード: <strong className="line-link-code">{linkCode}</strong>
              </p>
            ) : null}
          </div>
        )}
        {linkError ? <p className="text-error">{linkError}</p> : null}
      </section>

      {listLoading ? <p>読み込み中…</p> : null}
      {listError ? <p className="text-error">{listError}</p> : null}

      {!listLoading ? (
        <LandlordBoard
          landlords={landlords}
          sources={sources}
          houses={houses.map(boardHouse)}
          onAddLandlord={onAddLandlord}
          onRenameLandlord={onRenameLandlord}
          onAddSource={onAddSource}
          onDeleteSource={onDeleteSource}
          onDeleteLandlord={onDeleteLandlord}
          onHideHouse={onHideHouse}
          onDeleteManualHouse={onDeleteManualHouse}
        />
      ) : null}
    </section>
  );
}
