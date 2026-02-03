import React from 'react';
import { Card, Col, Row, Statistic, Table, Typography, Spin, Tag, theme } from 'antd';
import { ShopOutlined } from '@ant-design/icons';
import { Pie } from '@ant-design/plots';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import './DashboardPage.css';

const { Title, Text } = Typography;

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const DashboardPage: React.FC = () => {
    const { data: stats, isLoading } = useDashboardStats();
    const { token } = theme.useToken();
    const { user } = useAuth();
    const isBranchCustodian = user?.role === 'branch_custodian';
    const { mode } = useThemeMode();

    if (isLoading || !stats) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
                <Spin size="large" tip="Loading dashboard metrics..." />
            </div>
        );
    }

    // Chart configs
    const chartLabelColor = mode === 'dark' ? '#ffffff' : token.colorTextSecondary;
    const conditionConfig = {
        data: stats.by_condition,
        angleField: 'count',
        colorField: 'condition',
        innerRadius: 0.45,
        radius: 0.85,
        theme: mode === 'dark' ? 'dark' : 'light',
        label: {
            text: 'count',
            position: 'outside',
            style: {
                fill: chartLabelColor,
            },
        },
        legend: {
            color: {
                position: 'bottom',
                rowPadding: 5,
                label: {
                    style: {
                        fill: chartLabelColor,
                    },
                },
            },
        },
        height: 300,
    };

    const categoryConfig = {
        data: stats.by_category,
        angleField: 'count',
        colorField: 'name',
        innerRadius: 0.45,
        radius: 0.85,
        theme: mode === 'dark' ? 'dark' : 'light',
        label: {
            text: 'count',
            position: 'outside',
            style: {
                fill: chartLabelColor,
            },
        },
        legend: {
            color: {
                position: 'bottom',
                rowPadding: 5,
                label: {
                    style: {
                        fill: chartLabelColor,
                    },
                },
            },
        },
        height: 300,
    };

    const hasStackedBranches = (stats.by_branch_stacked || []).length > 0;
    const branchData = hasStackedBranches
        ? stats.by_branch_stacked
        : stats.by_branch;

    const palette = [
        '#a5b4fc',
        '#93c5fd',
        '#99f6e4',
        '#a7f3d0',
        '#fde68a',
        '#fbcfe8',
        '#f9a8d4',
        '#fdba74',
        '#c4b5fd',
        '#fecaca',
    ];

    const branchLabels = hasStackedBranches
        ? Array.from(new Set((branchData as any[]).map((item) => item.parent)))
        : (branchData as any[]).map((item) => item.name);

    const branchDatasets = hasStackedBranches
        ? Array.from(new Set((branchData as any[]).map((item) => item.branch))).map((branch, index) => {
            const color = palette[index % palette.length];
            return {
                label: branch,
                data: branchLabels.map((parent) => {
                    const entry = (branchData as any[]).find((item) => item.parent === parent && item.branch === branch);
                    return entry ? Number(entry.count) : 0;
                }),
                backgroundColor: color,
            };
        })
        : [
            {
                label: 'Assets',
                data: (branchData as any[]).map((item) => Number(item.count) || 0),
                backgroundColor: token.colorPrimary,
            },
        ];

    const branchChartData = {
        labels: branchLabels,
        datasets: branchDatasets,
    };

    const branchChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                callbacks: {
                    title: (items: any[]) => {
                        if (!items.length) return '';
                        return String(items[0].label ?? '');
                    },
                    label: (context: any) => {
                        const value = Number(context.parsed?.y ?? 0);
                        if (!value) return '';
                        const label = context.dataset?.label ?? '';
                        return `${label}: ${value}`;
                    },
                },
            },
        },
        scales: {
            x: {
                stacked: true,
                ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                },
                grid: {
                    display: false,
                },
            },
            y: {
                stacked: true,
                beginAtZero: true,
                ticks: {
                    stepSize: 1,
                    callback: (value: string | number) => Number.isInteger(Number(value)) ? value : '',
                },
            },
        },
    };


    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const sectionLabelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: 12,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: mode === 'dark' ? '#ffffff' : token.colorTextSecondary,
        marginBottom: 8,
    };

    const elevatedCardStyle: React.CSSProperties = {
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 14,
        boxShadow: '0 10px 24px rgba(0, 0, 0, 0.08)',
        background: token.colorBgContainer,
    };

    const dashboardClass = mode === 'dark' ? 'dashboard-page dark' : 'dashboard-page';

    return (
        <div className={dashboardClass} style={{ padding: '8px 12px 24px' }}>
            {mode === 'dark' && (
                <style>{`
                    /* Target all possible G2/Ant Design Plots legend text elements */
                    .dashboard-page.dark .g2-legend-item-name,
                    .dashboard-page.dark .g2-legend-item-value,
                    .dashboard-page.dark .g2-legend-title,
                    .dashboard-page.dark .g2-legend-item-text,
                    .dashboard-page.dark .g2-legend-item-label,
                    .dashboard-page.dark .g2-legend-item,
                    .dashboard-page.dark .g2-legend-list-item,
                    .dashboard-page.dark .g2-legend-list-item span,
                    .dashboard-page.dark .g2-legend-item span,
                    .dashboard-page.dark .g2-legend-category-item,
                    .dashboard-page.dark .g2-legend-marker-text,
                    .dashboard-page.dark .g2-legend text,
                    .dashboard-page.dark .g2-legend-item text,
                    .dashboard-page.dark .g2-legend-list text,
                    .dashboard-page.dark .g2-legend-category text,
                    .dashboard-page.dark div[class*="g2-legend"] span,
                    .dashboard-page.dark div[class*="g2-legend"] div,
                    .dashboard-page.dark .g2-tooltip-list-item-name,
                    .dashboard-page.dark .g2-tooltip-list-item-value {
                        fill: #ffffff !important;
                        color: #ffffff !important;
                    }
                `}</style>
            )}

            {/* Top Row: Key Metrics */}
            <div style={sectionLabelStyle}>Key metrics</div>
            <div
                className="dashboard-metrics"
                style={{ background: token.colorBgContainer, borderRadius: 14, padding: 6 }}
            >
                <div className="dashboard-metrics__grid">
                    <Card bordered={false} hoverable style={elevatedCardStyle} bodyStyle={{ padding: '16px 18px' }}>
                        <Statistic
                            title="Total Assets"
                            value={stats.total_assets}
                            prefix={<ShopOutlined />}
                        />
                        <div style={{ marginTop: 10, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                            <Tag color="success">Active: {stats.active_assets}</Tag>
                            <Tag color="default">Inactive: {stats.inactive_assets}</Tag>
                        </div>
                    </Card>
                    <Card bordered={false} hoverable style={elevatedCardStyle} bodyStyle={{ padding: '16px 18px' }}>
                        <Statistic
                            title="Total Acquisition Cost"
                            value={stats.acquisition_cost}
                            formatter={(val) => formatCurrency(Number(val))}
                            prefix="₱"
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>Total asset investment</Text>
                    </Card>
                    <Card bordered={false} hoverable style={elevatedCardStyle} bodyStyle={{ padding: '16px 18px' }}>
                        <Statistic
                            title="Total Depreciation"
                            value={stats.total_depreciation}
                            valueStyle={{ color: '#cf1322' }}
                            formatter={(val) => formatCurrency(Number(val))}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>All-time value reduction</Text>
                    </Card>
                    <Card bordered={false} hoverable style={elevatedCardStyle} bodyStyle={{ padding: '16px 18px' }}>
                        <Statistic
                            title="Monthly Depreciation"
                            value={stats.monthly_depreciation_expense}
                            formatter={(val) => formatCurrency(Number(val))}
                            prefix="₱"
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>Current monthly expense</Text>
                    </Card>
                    <Card bordered={false} hoverable style={elevatedCardStyle} bodyStyle={{ padding: '16px 18px' }}>
                        <Statistic
                            title="Fully Depreciated (Active)"
                            value={stats.fully_depreciated_active}
                            valueStyle={{ color: token.colorSuccess }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>Still in use with zero book value</Text>
                    </Card>
                </div>
            </div>

            {/* Second Row: Distribution */}
            <div style={{ ...sectionLabelStyle, marginTop: 16 }}>Distribution</div>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} md={12}>
                    <Card bordered={false} style={elevatedCardStyle} bodyStyle={{ padding: '12px 16px 8px' }}>
                        <Text type="secondary" style={sectionLabelStyle}>Assets by condition</Text>
                        <Pie {...conditionConfig} />
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card bordered={false} style={elevatedCardStyle} bodyStyle={{ padding: '12px 16px 8px' }}>
                        <Text type="secondary" style={sectionLabelStyle}>Assets by category</Text>
                        <Pie {...categoryConfig} />
                    </Card>
                </Col>
            </Row>

            {!isBranchCustodian && (
                <>
                    {/* Third Row: Branch */}
                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                        <Col xs={24}>
                            <Card bordered={false} style={elevatedCardStyle} bodyStyle={{ padding: '12px 16px 8px' }}>
                                <Text type="secondary" style={sectionLabelStyle}>Assets by branch</Text>
                                <div style={{ height: 320 }}>
                                    <Bar data={branchChartData} options={branchChartOptions} />
                                </div>
                            </Card>
                        </Col>
                    </Row>

                    {/* Fourth Row: Lists */}
                    <div style={{ ...sectionLabelStyle, marginTop: 16 }}>Leaderboards</div>
                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                        <Col xs={24} md={12}>
                            <Card bordered={false} style={elevatedCardStyle} bodyStyle={{ padding: '16px 18px' }}>
                                <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>Top 5 Suppliers</Title>
                                <Table
                                    dataSource={stats.top_suppliers}
                                    rowKey="name"
                                    pagination={false}
                                    columns={[
                                        { title: 'Supplier Name', dataIndex: 'name', key: 'name' },
                                        { title: 'Assets Supplied', dataIndex: 'count', key: 'count', align: 'right' },
                                    ]}
                                    size="small"
                                />
                            </Card>
                        </Col>
                        <Col xs={24} md={12}>
                            <Card bordered={false} style={elevatedCardStyle} bodyStyle={{ padding: '16px 18px' }}>
                                <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>Top Assigned Users</Title>
                                <Table
                                    dataSource={stats.top_assigned}
                                    rowKey="assigned_to"
                                    pagination={false}
                                    columns={[
                                        { title: 'User (Assigned To)', dataIndex: 'assigned_to', key: 'assigned_to' },
                                        { title: 'Total Assets', dataIndex: 'count', key: 'count', align: 'right' },
                                    ]}
                                    size="small"
                                />
                            </Card>
                        </Col>
                    </Row>
                </>
            )}
        </div>
    );
};

export default DashboardPage;
