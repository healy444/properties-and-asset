import React, { useEffect, useRef, useState } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Modal } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    DashboardOutlined,
    DatabaseOutlined,
    TeamOutlined,
    HistoryOutlined,
    LogoutOutlined,
    UserOutlined,
    SettingOutlined,
    BankOutlined,
    ShopOutlined,
    ApiOutlined,
    BulbOutlined,
    MoonOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import brandLogoLight from '../assets/brand-logo.png';
import brandLogoDark from '../assets/brand-logo-dark.png';
import { useThemeMode } from '../context/ThemeContext';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout } = useAuth();
    const { mode, toggleMode } = useThemeMode();
    const navigate = useNavigate();
    const location = useLocation();
    const [showHeader, setShowHeader] = useState(true);
    const lastScrollY = useRef(0);
    const {
        token: { colorBgContainer, borderRadiusLG, colorText },
    } = theme.useToken();

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

    const isBranchCustodian = user?.role === 'branch_custodian';

    const menuItems = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: 'Dashboard',
        },
        {
            key: 'credit',
            icon: <BankOutlined />,
            label: 'Credit',
            children: [
                {
                    key: '/assets',
                    label: 'Asset Management',
                },
                !isBranchCustodian ? {
                    key: '/credit/properties',
                    label: 'Properties',
                } : null,
            ]
                .filter(Boolean) as any[],
        },
        {
            key: '/resort',
            icon: <ShopOutlined />,
            label: 'Resort',
            hidden: isBranchCustodian,
        },
        {
            key: '/cable',
            icon: <ApiOutlined />,
            label: 'Cable',
            hidden: isBranchCustodian,
        },
        {
            key: '/audit-logs',
            icon: <HistoryOutlined />,
            label: 'Audit Trail',
            hidden: user?.role !== 'super_admin',
        },
        {
            key: '/users',
            icon: <TeamOutlined />,
            label: 'User Management',
            hidden: !(user?.role === 'super_admin' || user?.role === 'admin'),
        },
        {
            key: '/references',
            icon: <SettingOutlined />,
            label: 'Reference Data',
            hidden: !(user?.role === 'super_admin' || user?.role === 'admin') || isBranchCustodian,
        },
    ].filter(item => !item.hidden);

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

    const siderWidth = 230;
    const collapsedWidth = 80;
    const headerHeight = 64;

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


    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                theme="light"
                style={{
                    boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    height: '100vh',
                    overflow: 'auto',
                }}
                width={siderWidth}
            >
                <div style={{ margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                    <img
                        src={mode === 'dark' ? brandLogoDark : brandLogoLight}
                        alt="Brand logo"
                        style={{ height: collapsed ? 28 : 36, objectFit: 'contain' }}
                    />
                    <h1
                        style={{
                            fontSize: collapsed ? 12 : 16,
                            margin: 0,
                            fontWeight: 'bold',
                            textAlign: 'center',
                            lineHeight: 1.2,
                            color: mode === 'dark' ? '#ffffff' : colorText,
                        }}
                    >
                        {collapsed ? 'PAMS' : 'Properties and Assets Management System'}
                    </h1>
                </div>
                <div style={{ margin: '0 16px 8px', borderBottom: '1px solid #f0f0f0' }} />
                <Menu
                    theme="light"
                    mode="inline"
                    defaultSelectedKeys={[location.pathname]}
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                />
            </Sider>
            <Layout style={{ marginLeft: collapsed ? collapsedWidth : siderWidth, minHeight: '100vh', paddingTop: headerHeight }}>
                <Header
                    style={{
                        padding: 0,
                        background: colorBgContainer,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingRight: 24,
                        position: 'fixed',
                        top: 0,
                        left: collapsed ? collapsedWidth : siderWidth,
                        right: 0,
                        height: headerHeight,
                        zIndex: 10,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        transform: showHeader ? 'translateY(0)' : `translateY(-${headerHeight}px)`,
                        transition: 'transform 0.25s ease',
                    }}
                >
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: '16px', width: 64, height: 64 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingRight: 8 }}>
                        <button
                            onClick={toggleMode}
                            aria-label="Toggle theme"
                            style={{
                                border: 'none',
                                background: 'transparent',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <div
                                style={{
                                    width: 68,
                                    height: 32,
                                    borderRadius: 20,
                                    background: mode === 'dark' ? '#1f2937' : '#e6e8f0',
                                    position: 'relative',
                                    padding: '6px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 14,
                                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.12)',
                                    transition: 'background 0.2s ease',
                                }}
                            >
                                <BulbOutlined style={{ color: mode === 'dark' ? '#9ca3af' : '#1f2937', fontSize: 14 }} />
                                <MoonOutlined style={{ color: mode === 'dark' ? '#fefefe' : '#9ca3af', fontSize: 14, marginLeft: 'auto' }} />
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 4,
                                        left: mode === 'dark' ? 34 : 4,
                                        width: 30,
                                        height: 24,
                                        borderRadius: 14,
                                        background: '#2f43d9',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                        transition: 'left 0.2s ease',
                                    }}
                                />
                            </div>
                        </button>
                        <span style={{ fontWeight: 500 }}>{user?.first_name} {user?.last_name}</span>
                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                            <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer', backgroundColor: '#1677ff' }} />
                        </Dropdown>
                    </div>
                </Header>
                <Content
                    style={{
                        margin: '24px 16px',
                        padding: 24,
                        minHeight: 280,
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                        overflow: 'initial',
                        marginTop: 8,
                    }}
                >
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
