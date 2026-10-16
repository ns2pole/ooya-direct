import { useNavigate, useParams } from 'react-router-dom';
import { homePathForHouse } from '../lib/houseListSummary';
import { scrollToTop } from '../lib/scrollToTop';

export function HouseDetailBackButton() {
  const navigate = useNavigate();
  const { houseId } = useParams();

  function onBack() {
    navigate(houseId ? homePathForHouse(houseId) : '/');
    scrollToTop();
  }

  return (
    <button type="button" className="app-header-back" onClick={onBack}>
      ← 戻る
    </button>
  );
}
