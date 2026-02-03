import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useThemeMode } from './context/ThemeContext';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import { protectedRoutes, routePaths } from './routes/appRoutes';
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
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Navigate to={routePaths.dashboard} replace />} />
                  {protectedRoutes.map((route) => (
                    <Route key={route.path} path={route.path} element={route.element} />
                  ))}
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
