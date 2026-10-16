import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PageTitleProvider } from './context/PageTitleContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { HouseDetailPage } from './pages/HouseDetailPage';
import { AdminShell } from './pages/admin/AdminShell';
import { AdminHousesPage } from './pages/admin/AdminHousesPage';
import { AdminLandlordsPage } from './pages/admin/AdminLandlordsPage';
import { AdminLinePage } from './pages/admin/AdminLinePage';
import { LandlordFormPage } from './pages/admin/LandlordFormPage';
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
              <Route path="landlord" element={<AdminShell />}>
                <Route index element={<Navigate to="houses" replace />} />
                <Route path="houses" element={<AdminHousesPage />} />
                <Route path="houses/new" element={<HouseFormPage />} />
                <Route path="houses/:houseId/edit" element={<HouseFormPage />} />
                <Route path="landlords" element={<AdminLandlordsPage />} />
                <Route path="landlords/new" element={<LandlordFormPage />} />
                <Route path="landlords/:landlordId" element={<LandlordFormPage />} />
                <Route path="line" element={<AdminLinePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          </ToastProvider>
        </PageTitleProvider>
      </AuthProvider>
    </HashRouter>
  );
}
