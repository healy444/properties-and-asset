import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Typography } from 'antd';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import brandLogo from '../assets/brand-logo.png';

interface ProtectedRouteProps {
    allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
            }}>
                <style>
                    {`@keyframes pulseLogo {
                        0% { transform: scale(1); opacity: 0.8; }
                        50% { transform: scale(1.08); opacity: 1; }
                        100% { transform: scale(1); opacity: 0.8; }
                    }`}
                </style>
                <img
                    src={brandLogo}
                    alt="Loading"
                    style={{
                        width: 120,
                        height: 'auto',
                        animation: 'pulseLogo 1.4s ease-in-out infinite',
                    }}
                />
                <Typography.Text type="secondary" style={{ fontSize: 16 }}>
                    Loading...
                </Typography.Text>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
