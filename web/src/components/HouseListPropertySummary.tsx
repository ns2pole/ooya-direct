import type { House } from '../types';
import { housePropertyListSummary } from '../lib/housePropertyFields';

type Props = {
  house: House;
};

export function HouseListPropertySummary({ house }: Props) {
  const { rows, compactValues } = housePropertyListSummary(house);
  if (rows.length === 0 && compactValues.length === 0) return null;

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
      {compactValues.length > 0 ? (
        <p className="house-list-property-compact">
          {compactValues.map((value, index) => (
            <span key={`${value}-${index}`} className="house-list-property-compact-item">
              {index > 0 ? (
                <span className="house-list-property-compact-sep" aria-hidden="true">
                  {' '}
                  ·{' '}
                </span>
              ) : null}
              {value}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
