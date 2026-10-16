import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  groupLandlordBoard,
  portalLabel,
  type BoardHouse,
  type BoardLandlord,
  type BoardSource,
} from '../lib/landlordBoard';

type Props = {
  landlords: BoardLandlord[];
  sources: BoardSource[];
  houses: BoardHouse[];
  onAddLandlord: (name: string) => Promise<void>;
  onRenameLandlord: (landlordId: string, name: string) => Promise<void>;
  onAddSource: (landlordId: string, url: string) => Promise<void>;
  onDeleteSource: (sourceId: string) => Promise<void>;
  onDeleteLandlord: (landlordId: string) => Promise<void>;
  onHideHouse: (houseId: string, hidden: boolean) => Promise<void>;
  onDeleteManualHouse: (house: BoardHouse) => Promise<void>;
};

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : '処理に失敗しました。';
}

function HouseRow({
  house,
  onHideHouse,
  onDeleteManualHouse,
}: {
  house: BoardHouse;
  onHideHouse: Props['onHideHouse'];
  onDeleteManualHouse: Props['onDeleteManualHouse'];
}) {
  const title = house.title.trim() || '（無題）';
  return (
    <li className={house.hidden ? 'landlord-row landlord-row--hidden' : 'landlord-row'} aria-label={title}>
      <div className="landlord-row-head">
        <div className="landlord-row-text">
          <strong>{title}</strong>
          {house.hidden ? <div className="muted landlord-row-meta">非表示</div> : null}
          {house.meta ? <div className="muted landlord-row-meta">{house.meta}</div> : null}
        </div>
        {house.coverPhotoUrl ? (
          <img
            src={house.coverPhotoUrl}
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
        {house.hidden ? null : (
          <Link to={`/houses/${house.id}`} className="btn ghost">
            公開ページ
          </Link>
        )}
        {house.fromSync ? (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              const next = !house.hidden;
              const verb = next ? '公開ページから外します' : '公開ページに戻します';
              if (!window.confirm(`「${title}」を${verb}か？`)) return;
              void onHideHouse(house.id, next);
            }}
          >
            {house.hidden ? '再表示' : '非表示'}
          </button>
        ) : (
          <>
            <Link to={`/landlord/houses/${house.id}/edit`} className="btn ghost">
              編集
            </Link>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                if (!window.confirm(`「${title}」を削除しますか？`)) return;
                void onDeleteManualHouse(house);
              }}
            >
              削除
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function LandlordSection({
  landlord,
  sources,
  houses,
  onRenameLandlord,
  onAddSource,
  onDeleteSource,
  onDeleteLandlord,
  onHideHouse,
  onDeleteManualHouse,
}: {
  landlord: BoardLandlord;
  sources: BoardSource[];
  houses: BoardHouse[];
} & Pick<
  Props,
  | 'onRenameLandlord'
  | 'onAddSource'
  | 'onDeleteSource'
  | 'onDeleteLandlord'
  | 'onHideHouse'
  | 'onDeleteManualHouse'
>) {
  const [name, setName] = useState(landlord.name);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [group] = groupLandlordBoard([landlord], sources, houses);
  const headingId = `landlord-${landlord.id}`;

  return (
    <section className="landlord-group" aria-labelledby={headingId} aria-label={landlord.name}>
      <div className="landlord-group-head">
        <h2 id={headingId}>{landlord.name}</h2>
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            if (!window.confirm(`「${landlord.name}」と、その物件・URLをすべて削除しますか？`)) return;
            void onDeleteLandlord(landlord.id).catch((err) => setError(messageOf(err)));
          }}
        >
          大家を削除
        </button>
      </div>
      <form
        className="row"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          void onRenameLandlord(landlord.id, name)
            .catch((err) => setError(messageOf(err)));
        }}
      >
        <label className="field">
          <span>大家の名前</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} />
        </label>
        <button type="submit" className="btn ghost">
          名前を保存
        </button>
      </form>
      <form
        className="row"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          void onAddSource(landlord.id, url)
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
        <Link to={`/landlord/houses/new?landlord=${landlord.id}`} className="btn ghost">
          手動登録
        </Link>
      </form>
      {error ? <p className="text-error">{error}</p> : null}
      {group.portals.map((portal) => (
        <div key={portal.source.id} className="portal-block">
          <div className="landlord-group-head">
            <h3>{portalLabel(portal.source.portal)}</h3>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                if (!window.confirm('このURLと、そこから取り込んだ物件を削除しますか？')) return;
                void onDeleteSource(portal.source.id).catch((err) => setError(messageOf(err)));
              }}
            >
              このURLを削除
            </button>
          </div>
          <p className="muted small">{portal.source.url}</p>
          {portal.houses.length === 0 ? (
            <p className="muted small">このURLの物件はまだありません。</p>
          ) : (
            <ul className="house-list">
              {portal.houses.map((house) => (
                <HouseRow
                  key={house.id}
                  house={house}
                  onHideHouse={onHideHouse}
                  onDeleteManualHouse={onDeleteManualHouse}
                />
              ))}
            </ul>
          )}
        </div>
      ))}
      <div className="portal-block">
        <h3>ポータルなし</h3>
        {group.manualHouses.length === 0 ? (
          <p className="muted small">手動物件はありません。</p>
        ) : (
          <ul className="house-list">
            {group.manualHouses.map((house) => (
              <HouseRow
                key={house.id}
                house={house}
                onHideHouse={onHideHouse}
                onDeleteManualHouse={onDeleteManualHouse}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function LandlordBoard(props: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const groups = groupLandlordBoard(props.landlords, props.sources, props.houses);

  return (
    <div className="stack-lg">
      <form
        className="row"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          void props
            .onAddLandlord(name)
            .then(() => setName(''))
            .catch((err) => setError(messageOf(err)));
        }}
      >
        <label className="field">
          <span>大家の名前</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={80}
          />
        </label>
        <button type="submit" className="btn primary">
          大家を登録
        </button>
        {props.landlords.length === 0 ? (
          <button type="button" className="btn primary" disabled>
            新規登録
          </button>
        ) : (
          <Link to="/landlord/houses/new" className="btn primary">
            新規登録
          </Link>
        )}
      </form>
      {error ? <p className="text-error">{error}</p> : null}
      {groups.map((group) => (
        <LandlordSection
          key={group.landlord.id}
          landlord={group.landlord}
          sources={props.sources}
          houses={props.houses}
          onRenameLandlord={props.onRenameLandlord}
          onAddSource={props.onAddSource}
          onDeleteSource={props.onDeleteSource}
          onDeleteLandlord={props.onDeleteLandlord}
          onHideHouse={props.onHideHouse}
          onDeleteManualHouse={props.onDeleteManualHouse}
        />
      ))}
    </div>
  );
}
