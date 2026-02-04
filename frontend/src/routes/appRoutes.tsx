import AssetFormPage from '../pages/AssetFormPage';
import AssetListPage from '../pages/AssetListPage';
import AuditLogPage from '../pages/AuditLogPage';
import CablePage from '../pages/CablePage';
import CreditPropertiesPage from '../pages/CreditPropertiesPage';
import DashboardPage from '../pages/DashboardPage';
import ProfilePage from '../pages/ProfilePage';
import ReferenceManagementPage from '../pages/ReferenceManagementPage';
import ResortPage from '../pages/ResortPage';
import UserListPage from '../pages/UserListPage';

export const routePaths = {
  dashboard: '/dashboard',
  assets: '/assets',
  assetsNew: '/assets/new',
  assetsEdit: '/assets/:id/edit',
  creditProperties: '/credit/properties',
  resort: '/resort',
  cable: '/cable',
  auditLogs: '/audit-logs',
  users: '/users',
  references: '/references',
  profile: '/profile',
};

export const protectedRoutes = [
  { path: routePaths.dashboard, element: <DashboardPage /> },
  { path: routePaths.assets, element: <AssetListPage /> },
  { path: routePaths.assetsNew, element: <AssetFormPage /> },
  { path: routePaths.assetsEdit, element: <AssetFormPage /> },
  { path: routePaths.creditProperties, element: <CreditPropertiesPage /> },
  { path: routePaths.resort, element: <ResortPage /> },
  { path: routePaths.cable, element: <CablePage /> },
  { path: routePaths.auditLogs, element: <AuditLogPage /> },
  { path: routePaths.users, element: <UserListPage /> },
  { path: routePaths.references, element: <ReferenceManagementPage /> },
  { path: routePaths.profile, element: <ProfilePage /> },
];
