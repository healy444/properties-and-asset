import AssetFormPage from '../pages/AssetFormPage';
import AssetListPage from '../pages/AssetListPage';
import AuditLogPage from '../pages/AuditLogPage';
import DashboardPage from '../pages/DashboardPage';
import ProfilePage from '../pages/ProfilePage';
import ReferenceManagementPage from '../pages/ReferenceManagementPage';
import UserListPage from '../pages/UserListPage';

export const routePaths = {
  dashboard: '/dashboard',
  assets: '/assets',
  assetsNew: '/assets/new',
  assetsEdit: '/assets/:id/edit',
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
  { path: routePaths.auditLogs, element: <AuditLogPage /> },
  { path: routePaths.users, element: <UserListPage /> },
  { path: routePaths.references, element: <ReferenceManagementPage /> },
  { path: routePaths.profile, element: <ProfilePage /> },
];
