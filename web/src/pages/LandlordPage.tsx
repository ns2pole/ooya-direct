import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';
import { getDb, getFns, isFirebaseConfigured } from '../firebase';
import { deleteAllHousePhotos } from '../lib/housePhotos';
import { useAuth } from '../context/AuthContext';
import { housePropertyListChips } from '../lib/housePropertyFields';
import type { House, LandlordProfile } from '../types';
import { mapHouse, houseCoverPhoto } from '../lib/mapHouse';
import { formatDateOnly } from '../format';
import { usePageTitle } from '../context/PageTitleContext';
import { lineAddFriendUrl } from '../lib/lineConfig';

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

export function LandlordPage() {
  const { user, loading, signInWithEmailPassword, signOutUser } = useAuth();
  usePageTitle(user ? 'マイ物件' : '大家さん');
  const [houses, setHouses] = useState<House[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
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

  async function onDelete(h: House) {
    if (!user || h.ownerId !== user.uid) return;
    if (!window.confirm(`「${h.title || '無題'}」を削除しますか？`)) return;
    await deleteAllHousePhotos(h.id);
    await deleteDoc(doc(getDb(), 'houses', h.id));
    setHouses((prev) => prev.filter((x) => x.id !== h.id));
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

      <div className="row">
        <Link to="/landlord/houses/new" className="btn primary">
          新規登録
        </Link>
        <Link to="/" className="btn ghost">
          物件一覧
        </Link>
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

      {!listLoading && houses.length === 0 ? (
        <p className="muted">まだ物件がありません。「新規登録」から追加してください。</p>
      ) : (
        <ul className="house-list">
          {houses.map((h) => {
            const cover = houseCoverPhoto(h);
            return (
            <li key={h.id} className="landlord-row">
              <div className="landlord-row-head">
                <div className="landlord-row-text">
                  <strong>{h.title || '（無題）'}</strong>
                  <div className="muted landlord-row-meta">
                    {[
                      ...housePropertyListChips(h),
                      formatDateOnly(h.updatedAt ?? h.createdAt),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    className="landlord-thumb"
                    width={72}
                    height={52}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="landlord-thumb landlord-thumb--empty" aria-hidden />
                )}
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
            );
          })}
        </ul>
      )}
    </section>
  );
}
