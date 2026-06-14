import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PageTitleProvider } from './context/PageTitleContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { HouseDetailPage } from './pages/HouseDetailPage';
import { LandlordPage } from './pages/LandlordPage';
import { HouseFormPage } from './pages/HouseFormPage';

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <PageTitleProvider>
          <ToastProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="houses/:houseId" element={<HouseDetailPage />} />
              <Route path="landlord" element={<LandlordPage />} />
              <Route path="landlord/houses/new" element={<HouseFormPage />} />
              <Route path="landlord/houses/:houseId/edit" element={<HouseFormPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          </ToastProvider>
        </PageTitleProvider>
      </AuthProvider>
    </HashRouter>
  );
}
