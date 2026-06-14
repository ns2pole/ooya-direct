import type { House } from '../types';
import { housePropertyListSummary } from '../lib/housePropertyFields';

type Props = {
  house: House;
};

export function HouseListPropertySummary({ house }: Props) {
  const { rows, compactParts } = housePropertyListSummary(house);
  if (rows.length === 0 && compactParts.length === 0) return null;

  return (
    <div className="house-list-property">
      {rows.length > 0 ? (
        <dl className="house-property-table house-list-property-table">
          {rows.map(({ label, value }) => (
            <div key={label} className="house-property-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {compactParts.length > 0 ? (
        <p className="house-list-property-compact">
          {compactParts.map(({ label, value }, index) => (
            <span key={label} className="house-list-property-compact-item">
              {index > 0 ? <span className="house-list-property-compact-sep" aria-hidden="true"> · </span> : null}
              <span className="house-list-property-compact-label">{label}</span>
              <span className="house-list-property-compact-value">{value}</span>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
