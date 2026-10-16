type Props = {
  loading: boolean;
  linked: boolean;
  linkedAtLabel: string | null;
  linkCode: string | null;
  linkError: string | null;
  linkSubmitting: boolean;
  unlinkSubmitting: boolean;
  addFriendUrl: string;
  onStartLink: () => void;
  onUnlink: () => void;
};

export function LineLinkPanel({
  loading,
  linked,
  linkedAtLabel,
  linkCode,
  linkError,
  linkSubmitting,
  unlinkSubmitting,
  addFriendUrl,
  onStartLink,
  onUnlink,
}: Props) {
  return (
    <section className="panel stack line-link-panel" aria-labelledby="line-link-heading">
      <h2 id="line-link-heading" className="line-link-heading">
        LINE 通知
      </h2>
      {loading ? (
        <p className="muted small">LINE 連携状態を確認中…</p>
      ) : linked ? (
        <div className="stack">
          <p className="text-success">LINE 通知: 連携済み</p>
          {linkedAtLabel ? <p className="muted small">連携日: {linkedAtLabel}</p> : null}
          <button type="button" className="btn ghost" disabled={unlinkSubmitting} onClick={onUnlink}>
            {unlinkSubmitting ? '解除中…' : '連携を解除'}
          </button>
        </div>
      ) : (
        <div className="stack">
          <p className="muted small">問い合わせが届いたときに LINE で通知を受け取れます。</p>
          <ol className="muted small line-link-steps">
            <li>
              <a href={addFriendUrl} target="_blank" rel="noopener noreferrer">
                LINE 公式アカウントを友だち追加
              </a>
            </li>
            <li>下のボタンで連携コードを発行（10分間有効）</li>
            <li>LINE のトークに6桁のコードを送信</li>
          </ol>
          <button type="button" className="btn primary" disabled={linkSubmitting} onClick={onStartLink}>
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
  );
}
