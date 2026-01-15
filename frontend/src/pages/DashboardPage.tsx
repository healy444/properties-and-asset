import React from 'react';
import { Card, Col, Row, Statistic, Table, Typography, Spin, List, Tag, theme } from 'antd';
import { ShopOutlined, AlertOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Pie, Column } from '@ant-design/plots';
import { useDashboardStats } from '../hooks/useDashboardStats';

const { Title, Text } = Typography;

const DashboardPage: React.FC = () => {
    const { data: stats, isLoading } = useDashboardStats();
    const { token } = theme.useToken();

    if (isLoading || !stats) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
                <Spin size="large" tip="Loading dashboard metrics..." />
            </div>
        );
    }

    // Chart configs
    const conditionConfig = {
        data: stats.by_condition,
        angleField: 'count',
        colorField: 'condition',
        innerRadius: 0.6,
        radius: 0.8,
        label: {
            text: 'count', // v2 syntax check? using simple label for now
            position: 'outside',
        },
        legend: {
            color: {
                title: false,
                position: 'bottom',
                rowPadding: 5,
            },
        },
        height: 300,
    };

    const categoryConfig = {
        data: stats.by_category,
        angleField: 'count',
        colorField: 'name',
        innerRadius: 0.6,
        radius: 0.8,
        label: {
            text: 'count',
            position: 'outside',
        },
        legend: {
            color: {
                title: false,
                position: 'bottom',
                rowPadding: 5,
            },
        },
        height: 300,
    };

    const branchConfig = {
        data: stats.by_branch,
        xField: 'name',
        yField: 'count',
        color: token.colorPrimary,
        label: {
            text: 'count',
            textBaseline: 'bottom',
        },
        tooltip: {
            title: 'name',
            items: [{ channel: 'y' }]
        },
        height: 300,
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
        color: token.colorTextSecondary,
        marginBottom: 8,
    };

    const elevatedCardStyle: React.CSSProperties = {
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 14,
        boxShadow: '0 10px 24px rgba(0, 0, 0, 0.08)',
        background: token.colorBgContainer,
    };

    const metricsGridStyle: React.CSSProperties = {
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(5, minmax(180px, 1fr))',
        minWidth: 900,
    };

    return (
        <div style={{ padding: '8px 12px 24px' }}>

            {/* Top Row: Key Metrics */}
            <div style={sectionLabelStyle}>Key metrics</div>
            <div style={{ overflowX: 'auto', background: token.colorBgContainer, borderRadius: 14, padding: 6 }}>
                <div style={metricsGridStyle}>
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

            {/* Second Row: Health Checks */}
            <div style={{ ...sectionLabelStyle, marginTop: 16 }}>Health checks</div>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} sm={12}>
                    <Card
                        title="Assets Near End of Useful Life"
                        bordered={false}
                        extra={<AlertOutlined style={{ color: '#faad14' }} />}
                        style={elevatedCardStyle}
                        bodyStyle={{ padding: '16px 18px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Statistic value={stats.near_end_of_life_count} suffix="assets" valueStyle={{ fontSize: 24 }} />
                            <Text type="secondary">Review for replacement</Text>
                        </div>
                        <List
                            size="small"
                            dataSource={stats.near_end_of_life_list}
                            renderItem={(item) => (
                                <List.Item>
                                    <List.Item.Meta
                                        title={<Text strong>{item.model_number}</Text>}
                                        description={`Purchased: ${item.date_of_purchase}`}
                                    />
                                    <Tag color="warning">Expiring</Tag>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12}>
                    {/* Charts */}
                    <Card
                        title="Assets by Condition"
                        bordered={false}
                        style={elevatedCardStyle}
                        bodyStyle={{ padding: '12px 16px 8px' }}
                    >
                        <Pie {...conditionConfig} />
                    </Card>
                </Col>
            </Row>

            {/* Third Row: Charts */}
            <div style={{ ...sectionLabelStyle, marginTop: 16 }}>Distribution</div>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} md={12}>
                    <Card bordered={false} style={elevatedCardStyle} bodyStyle={{ padding: '12px 16px 8px' }}>
                        <Text type="secondary" style={sectionLabelStyle}>Assets by branch</Text>
                        <Column {...branchConfig} />
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card bordered={false} style={elevatedCardStyle} bodyStyle={{ padding: '12px 16px 8px' }}>
                        <Text type="secondary" style={sectionLabelStyle}>Assets by category</Text>
                        <Pie {...categoryConfig} />
                    </Card>
                </Col>
            </Row>

            {/* Fourth Row: Lists */}
            <div style={{ ...sectionLabelStyle, marginTop: 16 }}>Leaderboards</div>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} md={12}>
                    <Card bordered={false} style={elevatedCardStyle} bodyStyle={{ padding: '16px 18px' }}>
                        <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>Top 3 Suppliers</Title>
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
        </div>
    );
};

export default DashboardPage;
