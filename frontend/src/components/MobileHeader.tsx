import React, { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Dropdown, Modal, Tooltip } from 'antd';
import { BulbOutlined, LogoutOutlined, MoonOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import './MobileHeader.css';

const MobileHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;

      if (currentY < 8) {
        setShowHeader(true);
      } else if (currentY < lastScrollY.current) {
        setShowHeader(true);
      } else {
        setShowHeader(false);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    Modal.confirm({
      title: 'Log out?',
      content: 'Are you sure you want to log out of your account?',
      okText: 'Log out',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await logout();
        } finally {
          navigate('/login');
        }
      },
    });
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile',
      icon: <UserOutlined />,
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider' as const,
      key: 'divider-1',
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <>
      <button
        type="button"
        className="mobile-header__edge-hit"
        aria-label="Show header"
        onClick={() => setShowHeader(true)}
      />
      <header className={`mobile-header${showHeader ? '' : ' mobile-header--hidden'}`}>
        <div className="mobile-header__left">
          <div className="mobile-header__greeting">Hello,</div>
          <div className="mobile-header__name">
            {user?.first_name} {user?.last_name}
          </div>
        </div>
        <div className="mobile-header__right">
          <Tooltip title="Toggle theme">
            <Button
              type="text"
              onClick={toggleMode}
              className="mobile-header__theme-button"
              aria-label="Toggle theme"
            >
              <div className="mobile-header__theme-track">
                <BulbOutlined className="mobile-header__theme-icon" />
                <MoonOutlined className="mobile-header__theme-icon" />
                <div
                  className="mobile-header__theme-thumb"
                  style={{ left: mode === 'dark' ? 24 : 2 }}
                />
              </div>
            </Button>
          </Tooltip>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
            <Avatar icon={<UserOutlined />} className="mobile-header__avatar" />
          </Dropdown>
        </div>
      </header>
    </>
  );
};

export default MobileHeader;
