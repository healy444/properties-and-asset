import React from 'react';
import { Card, Col, Row, Statistic, Table, Typography, Spin, Tag, theme } from 'antd';
import { ShopOutlined } from '@ant-design/icons';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import './DashboardPage.css';

const { Title, Text } = Typography;

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

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
    const conditionPalette = ['#3b4bff', '#ffb020', '#ff4d4f', '#22c55e', '#0ea5e9'];
    const conditionItems = stats.by_condition?.length
        ? stats.by_condition.map((item) => ({
            name: String(item.condition ?? 'Unknown'),
            count: Number(item.count || 0),
        }))
        : [{ name: 'No data', count: 0 }];

    const conditionRingData = {
        labels: conditionItems.map((item) => item.name),
        datasets: [
            {
                label: 'Assets by condition',
                data: conditionItems.map((item) => item.count),
                backgroundColor: conditionItems.map(
                    (_item, index) => conditionPalette[index % conditionPalette.length],
                ),
                borderWidth: 0,
                borderRadius: 18,
                spacing: 6,
                hoverOffset: 0,
            },
        ],
    };

    const conditionRingOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        rotation: -110,
        circumference: 360,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const label = context.label ?? '';
                        const value = Number(context.parsed ?? 0);
                        return `${label}: ${value}`;
                    },
                },
            },
        },
    };

    const categoryTotal = stats.by_category.reduce((sum, item) => sum + Number(item.count || 0), 0);
    const categoryPalette = ['#2563eb', '#3b82f6', '#14b8a6', '#facc15', '#22c55e', '#f97316'];
    const maxRings = 5;
    const sortedCategories = [...stats.by_category].sort((a, b) => Number(b.count || 0) - Number(a.count || 0));
    const ringItems = sortedCategories.slice(0, maxRings).map((item) => ({
        name: item.name,
        count: Number(item.count || 0),
    }));
    const remaining = sortedCategories.slice(maxRings).reduce((sum, item) => sum + Number(item.count || 0), 0);
    if (remaining > 0) {
        ringItems.push({ name: 'Other', count: remaining });
    }
    if (ringItems.length === 0) {
        ringItems.push({ name: 'No data', count: 0 });
    }
    const safeTotal = categoryTotal || 1;
    const trackColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f2f4f7';
    const ringThickness = 13;
    const ringGap = 2;
    const outerRadius = 90;

    const categoryRingData = {
        labels: ringItems.map((item) => item.name),
        datasets: ringItems.map((item, index) => {
            const radius = outerRadius - index * (ringThickness + ringGap);
            const cutout = radius - ringThickness;
            return {
                label: item.name,
                data: [item.count, Math.max(safeTotal - item.count, 0)],
                backgroundColor: [categoryPalette[index % categoryPalette.length], trackColor],
                borderWidth: 0,
                hoverOffset: 0,
                radius: `${radius}%`,
                cutout: `${Math.max(cutout, 10)}%`,
            };
        }),
    };

    const categoryRingOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '30%',
        rotation: -90,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const label = context.dataset?.label ?? '';
                        const value = Number(context.parsed ?? 0);
                        return `${label}: ${value}`;
                    },
                },
            },
        },
    };

    const categoryCenterTextPlugin = {
        id: 'categoryCenterText',
        beforeDraw(chart: any) {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = mode === 'dark' ? '#f8fafc' : '#f59e0b';
            ctx.font = '600 13px "Segoe UI", sans-serif';
            ctx.fillText('Total', centerX, centerY - 10);
            ctx.fillStyle = mode === 'dark' ? '#e2e8f0' : '#94a3b8';
            ctx.font = '600 20px "Segoe UI", sans-serif';
            ctx.fillText(String(categoryTotal), centerX, centerY + 16);
            ctx.restore();
        },
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

    const branchCount = branchLabels.length || 1;
    const baseThickness = Math.floor(260 / branchCount);
    const barThickness = Math.min(10, Math.max(4, baseThickness)) + 3;

    const branchDatasets = hasStackedBranches
        ? Array.from(new Set((branchData as any[]).map((item) => item.branch))).map((branch, index) => {
            const color = palette[index % palette.length];
            return {
                label: branch,
                data: branchLabels.map((parent) => {
                    const entry = (branchData as any[]).find((item) => item.parent === parent && item.branch === branch);
                    return entry ? Number(entry.count) : null;
                }),
                backgroundColor: color,
                barThickness,
                categoryPercentage: 0.7,
                barPercentage: 0.5,
                borderRadius: 15,
                skipNull: true,
            };
        })
        : [
            {
                label: 'Assets',
                data: (branchData as any[]).map((item) => Number(item.count) || 0),
                backgroundColor: token.colorPrimary,
                barThickness,
                categoryPercentage: 0.7,
                barPercentage: 0.5,
                borderRadius: 15,
            },
        ];

    const branchChartData = {
        labels: branchLabels,
        datasets: branchDatasets,
    };

    const branchChartOptions: ChartOptions<'bar'> = {
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
                type: 'category' as const,
                stacked: false,
                offset: true,
                ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                    color: token.colorTextSecondary,
                    font: { size: 11 },
                    align: 'center' as const,
                },
                grid: {
                    display: false,
                },
            },
            y: {
                type: 'linear' as const,
                stacked: false,
                beginAtZero: true,
                ticks: {
                    stepSize: 1,
                    color: token.colorTextSecondary,
                    font: { size: 11 },
                    callback: (value: string | number) => Number.isInteger(Number(value)) ? value : '',
                },
                grid: {
                    color: mode === 'dark' ? 'rgba(148, 163, 184, 0.2)' : '#eef2f7',
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
                        <div className="dashboard-radial dashboard-radial--condition">
                            <div className="dashboard-radial__chart">
                                <Doughnut data={conditionRingData} options={conditionRingOptions} />
                            </div>
                            <div className="dashboard-radial__legend">
                                {conditionItems.map((item, index) => (
                                    <div className="dashboard-radial__legend-item" key={item.name}>
                                        <span
                                            className="dashboard-radial__legend-dot"
                                            style={{ backgroundColor: conditionPalette[index % conditionPalette.length] }}
                                        />
                                        <span className="dashboard-radial__legend-label">
                                            {item.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card bordered={false} style={elevatedCardStyle} bodyStyle={{ padding: '12px 16px 8px' }}>
                        <Text type="secondary" style={sectionLabelStyle}>Assets by category</Text>
                        <div className="dashboard-radial">
                            <div className="dashboard-radial__chart">
                                <Doughnut data={categoryRingData} options={categoryRingOptions} plugins={[categoryCenterTextPlugin]} />
                            </div>
                            <div className="dashboard-radial__legend">
                                {ringItems.map((item, index) => (
                                    <div className="dashboard-radial__legend-item" key={item.name}>
                                        <span
                                            className="dashboard-radial__legend-dot"
                                            style={{ backgroundColor: categoryPalette[index % categoryPalette.length] }}
                                        />
                                        <span className="dashboard-radial__legend-label">
                                            {item.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
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
