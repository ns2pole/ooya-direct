import { useState } from 'react';

type SourceRow = {
  id: string;
  url: string;
  portalLabel: string;
};

type Props = {
  name: string;
  sources: SourceRow[];
  onSaveName: (name: string) => Promise<void>;
  onAddUrl?: (url: string) => Promise<void>;
  onDeleteUrl?: (sourceId: string) => Promise<void>;
  onDeleteLandlord?: () => Promise<void>;
};

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : '処理に失敗しました。';
}

export function LandlordEditor({
  name: initialName,
  sources,
  onSaveName,
  onAddUrl,
  onDeleteUrl,
  onDeleteLandlord,
}: Props) {
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="panel stack">
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          void onSaveName(name).catch((err) => setError(messageOf(err)));
        }}
      >
        <label className="field">
          <span>大家の名前</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} />
        </label>
        <button type="submit" className="btn primary">
          名前を保存
        </button>
      </form>
      {onAddUrl ? (
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          void onAddUrl(url)
            .then(() => setUrl(''))
            .catch((err) => setError(messageOf(err)));
        }}
      >
        <label className="field">
          <span>ポータル</span>
          <select value="jimoty" disabled aria-label="ポータル">
            <option value="jimoty">ジモティー</option>
          </select>
        </label>
        <label className="field">
          <span>URL</span>
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://jmty.jp/profiles/..."
            required
          />
        </label>
        <button type="submit" className="btn primary">
          追加
        </button>
      </form>
      ) : null}
      {onAddUrl && onDeleteUrl ? (
        sources.length === 0 ? (
          <p className="muted">URLはまだありません。</p>
        ) : (
          <ul className="house-list">
            {sources.map((source) => (
              <li key={source.id} className="landlord-row">
                <div>
                  <strong>{source.portalLabel}</strong>
                  <div className="muted small">{source.url}</div>
                </div>
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    if (!window.confirm('このURLと、そこから取り込んだ物件を削除しますか？')) return;
                    void onDeleteUrl(source.id).catch((err) => setError(messageOf(err)));
                  }}
                >
                  このURLを削除
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {onDeleteLandlord ? (
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            if (!window.confirm(`「${name}」と、その物件・URLをすべて削除しますか？`)) return;
            void onDeleteLandlord().catch((err) => setError(messageOf(err)));
          }}
        >
          大家を削除
        </button>
      ) : null}
      {error ? <p className="text-error">{error}</p> : null}
    </section>
  );
}
