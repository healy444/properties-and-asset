import React, { useEffect, useMemo, useState } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import type { MobileNavItem } from '../navigation/navItems';
import './MobileBottomNav.css';

interface MobileBottomNavProps {
  items: MobileNavItem[];
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ items }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (!items.length) {
    return null;
  }

  useEffect(() => {
    setOpenKey(null);
  }, [location.pathname]);

  const isActive = (item: MobileNavItem) => {
    const patterns = item.matchPaths && item.matchPaths.length ? item.matchPaths : [item.key];
    return patterns.some((pattern) => matchPath({ path: pattern, end: false }, location.pathname));
  };

  const openItem = useMemo(() => items.find((item) => item.key === openKey), [items, openKey]);

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary">
      {openItem?.children ? (
        <div className="mobile-bottom-nav__sheet" role="dialog" aria-label={openItem.label}>
          {openItem.children.map((child) => (
            <button
              key={child.key}
              type="button"
              className="mobile-bottom-nav__sheet-item"
              onClick={() => navigate(child.key)}
            >
              <span className="mobile-bottom-nav__label">{child.label}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="mobile-bottom-nav__list">
        {items.map((item) => {
          const active = isActive(item);
          const isOpen = openKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={`mobile-bottom-nav__item${active ? ' mobile-bottom-nav__item--active' : ''}${isOpen ? ' mobile-bottom-nav__item--open' : ''}`}
              onClick={() => {
                if (item.children && item.children.length) {
                  setOpenKey(isOpen ? null : item.key);
                  return;
                }
                navigate(item.key);
              }}
              aria-current={active ? 'page' : undefined}
            >
              <span className="mobile-bottom-nav__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="mobile-bottom-nav__label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
