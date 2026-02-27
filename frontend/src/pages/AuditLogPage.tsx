import React, { useState } from 'react';
import { Table, Card, Tag, Space, Select, Button, Typography, DatePicker, Tooltip, Modal, Pagination, message } from 'antd';
import type { Breakpoint } from 'antd/es/_util/responsiveObserver';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, InfoCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from '../api/axios';
import type { AuditLog } from '../types';
import dayjs from 'dayjs';
import './AuditLogPage.css';
import useMediaQuery from '../hooks/useMediaQuery';

const { RangePicker } = DatePicker;
const { Text } = Typography;
const { Option } = Select;

const AuditLogPage: React.FC = () => {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        user_id: undefined,
        action: undefined,
        entity_type: undefined,
        entity_id: undefined,
        date_range: null as any,
    });
    const isMobile = useMediaQuery('(max-width: 768px)');

    const buildParams = () => {
        const params: any = {
            per_page: 15,
            ...filters
        };
        if (filters.date_range) {
            params.start_date = filters.date_range[0].format('YYYY-MM-DD');
            params.end_date = filters.date_range[1].format('YYYY-MM-DD');
        }
        return params;
    };

    const { data: logs, isLoading, refetch } = useQuery({
        queryKey: ['audit-logs', page, filters],
        queryFn: async () => {
            const params = { ...buildParams(), page };
            const response = await axios.get('/audit-logs', { params });
            return response.data;
        }
    });

    const exportMutation = useMutation({
        mutationFn: async () => {
            const response = await axios.get('/audit-logs/export', {
                params: buildParams(),
                responseType: 'blob',
            });
            return response;
        },
        onSuccess: (response) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
            link.setAttribute('download', `audit_logs_${timestamp}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            message.success('Audit logs exported successfully');
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Export failed');
        },
    });

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'green';
            case 'UPDATE': return 'blue';
            case 'DELETE': return 'red';
            case 'LOGIN': return 'cyan';
            case 'LOGOUT': return 'purple';
            case 'APPROVE_DELETE': return 'success';
            case 'REJECT_DELETE': return 'warning';
            default: return 'default';
        }
    };

    const responsiveMd: Breakpoint[] = ['md'];
    const columns: ColumnsType<AuditLog> = [
        {
            title: 'Timestamp',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
            render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
        },
        {
            title: 'User',
            key: 'user',
            width: 220,
            responsive: responsiveMd,
            render: (log: AuditLog) => (
                <Space size={4} style={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title={`ID: ${log.user_id}`}>
                        <Text strong>{log.user?.username || 'System'}</Text>
                    </Tooltip>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        ({log.user?.first_name} {log.user?.last_name})
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            render: (action: string) => (
                <Tag color={getActionColor(action)}>{action}</Tag>
            ),
        },
        {
            title: 'Entity',
            key: 'entity',
            render: (log: AuditLog) => (
                log.entity_type ? (
                    <span>
                        <Text code>{log.entity_type}</Text>
                        {log.entity_id && <Text type="secondary"> #{log.entity_id}</Text>}
                    </span>
                ) : '-'
            ),
        },
        {
            title: 'Changes',
            key: 'changes',
            responsive: responsiveMd,
            render: (log: AuditLog) => {
                if (log.old_values || log.new_values) {
                    const keys = Object.keys(log.new_values || log.old_values || {});
                    return (
                        <div style={{ maxWidth: 280 }}>
                            {keys.slice(0, 3).map(key => (
                                <div key={key} style={{ fontSize: '12px' }}>
                                    <Text type="secondary">{key}:</Text> {String(log.new_values?.[key] || '-')}
                                </div>
                            ))}
                            {keys.length > 3 && <Text type="secondary">...and {keys.length - 3} more</Text>}
                        </div>
                    );
                }
                if (log.metadata) {
                    return <Text type="secondary" style={{ fontSize: '12px' }}>{JSON.stringify(log.metadata)}</Text>;
                }
                return '-';
            },
        },
        {
            title: 'Details',
            key: 'details',
            className: 'audit-log__details-col',
            width: 90,
            align: 'center',
            render: (log: AuditLog) => (
                <Tooltip title="View details">
                    <Button
                        type="link"
                        icon={<InfoCircleOutlined />}
                        onClick={() => Modal.info({
                            title: 'Log Entry Details',
                            width: 800,
                            content: (
                                <pre style={{ maxHeight: 500, overflow: 'auto' }}>
                                    {JSON.stringify(log, null, 2)}
                                </pre>
                            )
                        })}
                    />
                </Tooltip>
            ),
        },
    ];

    return (
        <div className="audit-log">
            <div style={{ marginBottom: 16 }}>
                <h2 style={{ margin: 0 }} className="audit-log__title">Audit Trail</h2>
            </div>

            <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <Button
                            icon={<DownloadOutlined />}
                            loading={exportMutation.isPending}
                            onClick={() => exportMutation.mutate()}
                        >
                            Export
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                            Refresh
                        </Button>
                    </div>
                    <Space wrap size="large">
                        <div>
                            <div style={{ marginBottom: 4 }}>Date Range</div>
                            <RangePicker
                                onChange={(dates) => setFilters(f => ({ ...f, date_range: dates }))}
                            />
                        </div>
                        <div>
                            <div style={{ marginBottom: 4 }}>Action</div>
                            <Select
                                placeholder="All Actions"
                                allowClear
                                style={{ width: 150 }}
                                onChange={val => setFilters(f => ({ ...f, action: val }))}
                            >
                                <Option value="CREATE">CREATE</Option>
                                <Option value="UPDATE">UPDATE</Option>
                                <Option value="DELETE">DELETE</Option>
                                <Option value="LOGIN">LOGIN</Option>
                                <Option value="RESET_PASSWORD">RESET_PASSWORD</Option>
                            </Select>
                        </div>
                        <div>
                            <div style={{ marginBottom: 4 }}>Entity Type</div>
                            <Select
                                placeholder="All Types"
                                allowClear
                                style={{ width: 150 }}
                                onChange={val => setFilters(f => ({ ...f, entity_type: val }))}
                            >
                                <Option value="Asset">Asset</Option>
                                <Option value="User">User</Option>
                                <Option value="Branch">Branch</Option>
                            </Select>
                        </div>
                    </Space>
                </div>
            </Card>

            {isMobile ? (
                <div className="audit-log__cards">
                    {(logs?.data || []).map((log: AuditLog) => (
                        <Card key={log.id} className="audit-log__card" size="small">
                            <div className="audit-log__card-row">
                                <div className="audit-log__card-meta">
                                    {dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss')}
                                </div>
                            </div>
                            <div className="audit-log__card-row">
                                <div className="audit-log__card-main">
                                    <Tag color={getActionColor(log.action)}>{log.action}</Tag>
                                    <span className="audit-log__card-entity">
                                        {log.entity_type ? (
                                            <>
                                                <Text code>{log.entity_type}</Text>
                                                {log.entity_id && <Text type="secondary"> #{log.entity_id}</Text>}
                                            </>
                                        ) : '-'}
                                    </span>
                                </div>
                                <Button
                                    type="text"
                                    aria-label="View details"
                                    className="audit-log__card-detail"
                                    icon={<InfoCircleOutlined />}
                                    onClick={() => Modal.info({
                                        title: 'Log Entry Details',
                                        width: 800,
                                        content: (
                                            <pre style={{ maxHeight: 500, overflow: 'auto' }}>
                                                {JSON.stringify(log, null, 2)}
                                            </pre>
                                        )
                                    })}
                                />
                            </div>
                        </Card>
                    ))}
                    <div className="audit-log__pagination">
                        <Pagination
                            current={page}
                            total={logs?.total}
                            pageSize={logs?.per_page || 15}
                            onChange={(p) => setPage(p)}
                            size="small"
                        />
                    </div>
                </div>
            ) : (
                <Table
                    columns={columns}
                    dataSource={logs?.data || []}
                    loading={isLoading}
                    rowKey="id"
                    pagination={{
                        current: page,
                        total: logs?.total,
                        pageSize: logs?.per_page || 15,
                        onChange: (p) => setPage(p),
                    }}
                />
            )}
        </div>
    );
};

export default AuditLogPage;
