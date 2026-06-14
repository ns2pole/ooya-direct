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
      <dl className="house-property-table house-list-property-table">
        {rows.map(({ label, value }) => (
          <div key={label} className="house-property-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        {compactValues.length > 0 ? (
          <div className="house-property-row house-property-row--values-only">
            <dd>{compactValues.join(' · ')}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
