import { useState, type FormEvent } from 'react';
import { FirebaseError } from 'firebase/app';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isFirebaseConfigured } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

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

export function AdminShell() {
  const { user, loading, signInWithEmailPassword } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  async function handleLoginSubmit(event: FormEvent) {
    event.preventDefault();
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      await signInWithEmailPassword(email, password);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      const message = err instanceof FirebaseError ? messageForAuthCode(code) : 'ログインに失敗しました。';
      setLoginError(message);
    } finally {
      setLoginSubmitting(false);
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
        <p>ログイン ID とパスワードで、物件と大家を登録できます。</p>
        <form className="stack" onSubmit={(event) => void handleLoginSubmit(event)}>
          <label className="field">
            <span>ログイン ID（メールアドレス）</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              onChange={(event) => setPassword(event.target.value)}
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

  if (location.pathname === '/landlord') {
    return <Navigate to="/landlord/houses" replace />;
  }

  return <Outlet />;
}
