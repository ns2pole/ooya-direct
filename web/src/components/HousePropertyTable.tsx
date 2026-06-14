import type { House } from '../types';
import { housePropertyDetailRows } from '../lib/housePropertyFields';

type Props = {
  house: House;
};

export function HousePropertyTable({ house }: Props) {
  const rows = housePropertyDetailRows(house);
  if (rows.length === 0) return null;

  return (
    <dl className="house-property-table">
      {rows.map(({ label, value }) => (
        <div key={label} className="house-property-row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
