import React from 'react';
import { Card, Col, Row, Statistic, Typography, Space, Table, Tag, List, Badge } from 'antd';
import { Pie, Column } from '@ant-design/plots';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { ArrowUpOutlined, ArrowDownOutlined, DatabaseOutlined, DollarOutlined, HistoryOutlined, AlertOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();

    const { data: metrics, isLoading } = useQuery({
        queryKey: ['dashboard-metrics'],
        queryFn: () => api.get('/dashboard/metrics').then(res => res.data),
    });

    if (isLoading) return <div>Loading Summary...</div>;

    const totals = metrics?.totals || {};
    const byStatus = metrics?.by_status || [];
    const byBranch = metrics?.by_branch || [];
    const byCategory = metrics?.by_category || [];
    const alerts = metrics?.alerts || {};
    const recentActivity = metrics?.recent_activity || [];

    // Chart Configs
    const statusPieConfig = {
        appendPadding: 10,
        data: byStatus,
        angleField: 'count',
        colorField: 'status',
        radius: 0.8,
        label: {
            type: 'outer',
            content: '{name}: {value}',
        },
        interactions: [{ type: 'element-active' }],
        onEvent: (chart: any, event: any) => {
            if (event.type === 'element:click') {
                const data = event.data?.data;
                if (data) {
                    const statusMap: any = { 'Draft': 'draft', 'Active': 'active', 'Pending Deletion': 'pending_deletion' };
                    navigate(`/assets?status=${statusMap[data.status]}`);
                }
            }
        }
    };

    const branchColumnConfig = {
        data: byBranch,
        xField: 'branch',
        yField: 'count',
        label: {
            position: 'middle',
            style: { fill: '#FFFFFF', opacity: 0.6 },
        },
        onEvent: (chart: any, event: any) => {
            if (event.type === 'element:click') {
                // Note: In real app, we'd need the ID, but for demo we filter by name or mapping
                // For simplicity, navigate to assets
                navigate('/assets');
            }
        }
    };

    const categoryPieConfig = {
        appendPadding: 10,
        data: byCategory,
        angleField: 'count',
        colorField: 'category',
        radius: 0.7,
        innerRadius: 0.6,
        label: {
            type: 'inner',
            offset: '-50%',
            content: '{value}',
            style: { textAlign: 'center', fontSize: 14 },
        },
        interactions: [{ type: 'element-selected' }, { type: 'element-active' }],
    };

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Title level={2}>Dashboard Overview</Title>

            {/* Top Stats */}
            <Row gutter={[16, 16]}>
                <Col span={6}>
                    <Card bordered={false} className="stat-card">
                        <Statistic
                            title="Total Active Assets"
                            value={totals.active_assets}
                            prefix={<DatabaseOutlined />}
                            valueStyle={{ color: '#1677ff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card bordered={false} className="stat-card">
                        <Statistic
                            title="Total Acquisition Cost"
                            value={totals.total_cost}
                            precision={2}
                            prefix={<Text style={{ fontSize: 20 }}>₱</Text>}
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card bordered={false} className="stat-card">
                        <Statistic
                            title="Monthly Depreciation"
                            value={totals.total_monthly_depreciation}
                            precision={2}
                            prefix={<ArrowDownOutlined />}
                            valueStyle={{ color: '#cf1322' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card bordered={false} className="stat-card">
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Text type="secondary">Condition Alerts</Text>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Badge count={alerts.fair} overflowCount={999} style={{ backgroundColor: '#faad14' }}>
                                    <Tag color="warning" style={{ margin: 0 }}>FAIR</Tag>
                                </Badge>
                                <Badge count={alerts.poor} overflowCount={999} style={{ backgroundColor: '#f5222d' }}>
                                    <Tag color="error" style={{ margin: 0 }}>POOR</Tag>
                                </Badge>
                            </div>
                        </Space>
                    </Card>
                </Col>
            </Row>

            {/* Charts Row 1 */}
            <Row gutter={[16, 16]}>
                <Col span={12}>
                    <Card title="Assets by Status (Interact to Filter)" bordered={false}>
                        <Pie {...statusPieConfig} />
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="Assets by Category" bordered={false}>
                        <Pie {...categoryPieConfig} />
                    </Card>
                </Col>
            </Row>

            {/* Charts Row 2 & Recent Activity */}
            <Row gutter={[16, 16]}>
                <Col span={14}>
                    <Card title="Assets by Branch" bordered={false}>
                        <Column {...branchColumnConfig} />
                    </Card>
                </Col>
                <Col span={10}>
                    <Card title="Recent Activity" bordered={false} extra={<HistoryOutlined />}>
                        <List
                            itemLayout="horizontal"
                            dataSource={recentActivity}
                            renderItem={(item: any) => (
                                <List.Item>
                                    <List.Item.Meta
                                        title={<Text strong>{item.action}</Text>}
                                        description={
                                            <Space direction="vertical" size={0}>
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    {item.user?.username} • {dayjs(item.created_at).fromNow()}
                                                </Text>
                                                <Text style={{ fontSize: '12px' }}>
                                                    {item.entity_type} {item.entity_id}
                                                </Text>
                                            </Space>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </Space>
    );
};

export default DashboardPage;
