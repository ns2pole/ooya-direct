import { useNavigate } from 'react-router-dom';
import { scrollToTop } from '../lib/scrollToTop';

export function HouseDetailBackButton() {
  const navigate = useNavigate();

  function onBack() {
    navigate('/');
    scrollToTop();
  }

  return (
    <button type="button" className="app-header-back" onClick={onBack}>
      ← 戻る
    </button>
  );
}
