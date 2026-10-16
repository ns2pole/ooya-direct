import { AREA_SIZE_OPTIONS } from '../constants/areaSizeOptions';
import { HOUSE_GENRE_OPTIONS } from '../constants/houseGenreOptions';
import type { HousePropertyFields } from '../lib/housePropertyFields';

type Props = {
  fields: HousePropertyFields;
  onChange: (key: keyof HousePropertyFields, value: string) => void;
};

export function HousePropertyFormFields({ fields, onChange }: Props) {
  return (
    <div className="field-group">
      <div className="field-row">
        <label className="field">
          <span>家賃</span>
          <input
            value={fields.rent}
            onChange={(e) => onChange('rent', e.target.value)}
            maxLength={50}
            placeholder="例: 8.5万円"
          />
        </label>
        <label className="field">
          <span>管理費等</span>
          <input
            value={fields.managementFee}
            onChange={(e) => onChange('managementFee', e.target.value)}
            maxLength={50}
            placeholder="例: 5000円"
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>ジャンル</span>
          <select value={fields.genre} onChange={(e) => onChange('genre', e.target.value)}>
            <option value="">任意</option>
            {HOUSE_GENRE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>敷/礼</span>
          <input
            value={fields.depositKeyMoney}
            onChange={(e) => onChange('depositKeyMoney', e.target.value)}
            maxLength={50}
            placeholder="例: 1ヶ月/1ヶ月"
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>間取り</span>
          <select value={fields.areaSize} onChange={(e) => onChange('areaSize', e.target.value)}>
            <option value="">任意</option>
            {AREA_SIZE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>面積</span>
          <input
            value={fields.floorArea}
            onChange={(e) => onChange('floorArea', e.target.value)}
            maxLength={50}
            placeholder="例: 45㎡"
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>階建</span>
          <input
            value={fields.floors}
            onChange={(e) => onChange('floors', e.target.value)}
            maxLength={50}
            placeholder="例: 3階建 / 2階"
          />
        </label>
        <label className="field">
          <span>築年数</span>
          <input
            value={fields.buildingAge}
            onChange={(e) => onChange('buildingAge', e.target.value)}
            maxLength={50}
            placeholder="例: 築15年"
          />
        </label>
      </div>

      <label className="field">
        <span>参考リンク</span>
        <input
          type="url"
          value={fields.referenceUrl}
          onChange={(e) => onChange('referenceUrl', e.target.value)}
          maxLength={2048}
          placeholder="例: https://www.yahoo.co.jp"
          inputMode="url"
          autoComplete="url"
        />
      </label>
    </div>
  );
}
