import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollToTop } from '../lib/scrollToTop';

export function ScrollToTopOnNavigate() {
  const { pathname } = useLocation();

  useEffect(() => {
    scrollToTop();
  }, [pathname]);

  return null;
}
