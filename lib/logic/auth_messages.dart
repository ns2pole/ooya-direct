String messageForAuthCode(String code) {
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
      return 'Firebase の API キーが無効です。コンソールの「プロジェクトの設定」→「マイアプリ」で apiKey をコピーし直し、firebase_defines.json を更新してアプリを再起動してください。Google Cloud の API キーにリファラー制限がある場合は localhost / 公開サイトのオリジンを許可してください。';
    default:
      return 'ログインに失敗しました。';
  }
}
