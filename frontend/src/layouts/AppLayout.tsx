import React from 'react';
import { Outlet } from 'react-router-dom';
import MobileBottomNav from '../components/MobileBottomNav';
import MobileHeader from '../components/MobileHeader';
import { useAuth } from '../context/AuthContext';
import useMediaQuery from '../hooks/useMediaQuery';
import { getMobileNavItems } from '../navigation/navItems';
import MainLayout from './MainLayout';
import './AppLayout.css';

const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const mobileMaxWidth = 768;
  const isMobile = useMediaQuery(`(max-width: ${mobileMaxWidth}px)`);
  const mobileNavItems = getMobileNavItems(user ?? null);

  if (!isMobile) {
    return <MainLayout />;
  }

  return (
    <div className="app-layout app-layout--mobile">
      <MobileHeader />
      <main className="app-layout__mobile-content">
        <Outlet />
      </main>
      <MobileBottomNav items={mobileNavItems} />
    </div>
  );
};

export default AppLayout;
