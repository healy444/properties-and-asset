import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useThemeMode } from './context/ThemeContext';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import AssetListPage from './pages/AssetListPage';
import AssetFormPage from './pages/AssetFormPage';
import DashboardPage from './pages/DashboardPage';
import UserListPage from './pages/UserListPage';
import AuditLogPage from './pages/AuditLogPage';
import ReferenceManagementPage from './pages/ReferenceManagementPage';
import ProfilePage from './pages/ProfilePage';
import CreditPropertiesPage from './pages/CreditPropertiesPage';
import ResortPage from './pages/ResortPage';
import CablePage from './pages/CablePage';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  const { mode } = useThemeMode();

  const algorithms = mode === 'dark' ? [antdTheme.darkAlgorithm] : [antdTheme.defaultAlgorithm];

  return (
    <ConfigProvider
      theme={{
        algorithm: algorithms,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
          fontFamily: 'Inter, sans-serif',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/assets" element={<AssetListPage />} />
                  <Route path="/assets/new" element={<AssetFormPage />} />
                  <Route path="/assets/:id/edit" element={<AssetFormPage />} />
                  <Route path="/credit/properties" element={<CreditPropertiesPage />} />
                  <Route path="/resort" element={<ResortPage />} />
                  <Route path="/cable" element={<CablePage />} />
                  <Route path="/audit-logs" element={<AuditLogPage />} />
                  <Route path="/users" element={<UserListPage />} />
                  <Route path="/references" element={<ReferenceManagementPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>
              </Route>

              <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ConfigProvider>
  );
};

const AppWithTheme: React.FC = () => {
  console.log('App: Rendering Full');
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
};

export default AppWithTheme;
