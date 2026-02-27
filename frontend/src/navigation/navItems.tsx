import React from 'react';
import {
  DashboardOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { User } from '../types';
import { routePaths } from '../routes/appRoutes';

export interface NavItemConfig {
  key: string;
  label: string;
  icon?: React.ReactNode;
  hidden?: boolean;
  desktopHidden?: boolean;
  mobileHidden?: boolean;
  mobileLabel?: string;
  mobileIcon?: React.ReactNode;
  matchPaths?: string[];
  children?: NavItemConfig[];
}

export interface MobileNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  matchPaths?: string[];
  children?: MobileNavItem[];
}

const buildNavConfig = (user: User | null): NavItemConfig[] => {
  const isBranchCustodian = user?.role === 'branch_custodian';
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  return [
    {
      key: routePaths.dashboard,
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      mobileIcon: <DashboardOutlined />,
    },
    {
      key: routePaths.assets,
      icon: <DatabaseOutlined />,
      label: 'Asset Management',
      mobileLabel: 'Asset',
      mobileIcon: <DatabaseOutlined />,
      matchPaths: [routePaths.assets, routePaths.assetsNew, routePaths.assetsEdit],
    },
    {
      key: routePaths.auditLogs,
      icon: <HistoryOutlined />,
      label: 'Audit Trail',
      hidden: !isSuperAdmin,
      mobileLabel: 'Audit',
      mobileIcon: <HistoryOutlined />,
    },
    {
      key: routePaths.users,
      icon: <TeamOutlined />,
      label: 'User Management',
      hidden: !isAdmin,
      mobileLabel: 'Users',
      mobileIcon: <TeamOutlined />,
    },
    {
      key: routePaths.references,
      icon: <SettingOutlined />,
      label: 'Reference Data',
      hidden: !isAdmin || isBranchCustodian,
      mobileLabel: 'Refs',
      mobileIcon: <SettingOutlined />,
    },
    {
      key: routePaths.profile,
      icon: <UserOutlined />,
      label: 'Profile',
      desktopHidden: true,
      mobileHidden: true,
      mobileIcon: <UserOutlined />,
    },
  ];
};

export const getDesktopNavItems = (user: User | null) => {
  const normalize = (items: NavItemConfig[]): NavItemConfig[] =>
    items
      .filter((item) => !item.hidden && !item.desktopHidden)
      .map((item) => {
        if (!item.children) {
          return item;
        }
        const children = normalize(item.children);
        return children.length ? { ...item, children } : { ...item, children: undefined };
      });

  return normalize(buildNavConfig(user));
};

export const getMobileNavItems = (user: User | null): MobileNavItem[] => {
  const buildMobileChildren = (items: NavItemConfig[]): MobileNavItem[] =>
    items.flatMap<MobileNavItem>((item) => {
      if (item.hidden || item.mobileHidden) {
        return [];
      }
      if (item.children) {
        return buildMobileChildren(item.children);
      }
      if (!item.icon && !item.mobileIcon) {
        return [];
      }
      return [
        {
          key: item.key,
          label: item.mobileLabel ?? item.label,
          icon: item.mobileIcon ?? item.icon!,
          matchPaths: item.matchPaths,
        },
      ];
    });

  const collect = (items: NavItemConfig[]): MobileNavItem[] =>
    items.flatMap<MobileNavItem>((item) => {
      if (item.hidden || item.mobileHidden) {
        return [];
      }
      if (item.children) {
        const children = buildMobileChildren(item.children);
        if (!children.length) {
          return [];
        }
        return [
          {
            key: item.key,
            label: item.mobileLabel ?? item.label,
            icon: item.mobileIcon ?? item.icon!,
            children,
            matchPaths: children.flatMap((child) => child.matchPaths ?? [child.key]),
          },
        ];
      }
      if (!item.icon && !item.mobileIcon) {
        return [];
      }
      return [
        {
          key: item.key,
          label: item.mobileLabel ?? item.label,
          icon: item.mobileIcon ?? item.icon!,
          matchPaths: item.matchPaths,
        },
      ];
    });

  return collect(buildNavConfig(user));
};
