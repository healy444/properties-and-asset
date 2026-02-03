import React from 'react';
import { Drawer, Descriptions, Tag, Table, Typography, Space, Divider, Collapse } from 'antd';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import type { Asset, AuditLog } from '../types';
import dayjs from 'dayjs';
import useMediaQuery from '../hooks/useMediaQuery';
import './AssetDetailsDrawer.css';

const { Text } = Typography;

interface AssetDetailsDrawerProps {
    id: number | null;
    visible: boolean;
    onClose: () => void;
}

const AssetDetailsDrawer: React.FC<AssetDetailsDrawerProps> = ({ id, visible, onClose }) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { data: asset, isLoading } = useQuery<Asset>({
        queryKey: ['asset-details', id],
        queryFn: () => api.get(`/assets/${id}`).then(res => res.data),
        enabled: !!id && visible,
    });

    const { data: audits } = useQuery<AuditLog[]>({
        queryKey: ['asset-audits', id],
        queryFn: () => api.get(`/audit-logs?entity_type=Asset&entity_id=${id}`).then(res => res.data.data),
        enabled: !!id && visible,
    });

    const auditColumns = [
        {
            title: 'Date',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: 'User',
            dataIndex: ['user', 'username'],
            key: 'user',
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            render: (action: string) => <Tag color="blue">{action}</Tag>,
        },
        {
            title: 'Changes',
            key: 'changes',
            render: (_: any, record: AuditLog) => (
                <div style={{ fontSize: '12px' }}>
                    {record.new_values && Object.keys(record.new_values).map(key => (
                        <div key={key}>
                            <Text strong>{key}:</Text> {String(record.old_values?.[key])} → {String(record.new_values[key])}
                        </div>
                    ))}
                    {!record.new_values && <Text type="secondary">N/A</Text>}
                </div>
            ),
        },
    ];

    return (
        <Drawer
            title={asset ? `Asset Details: ${asset.asset_code || 'Draft'}` : 'Loading...'}
            placement="right"
            onClose={onClose}
            open={visible}
            width={isMobile ? '100%' : 700}
            loading={isLoading}
            className="asset-details-drawer"
        >
            {asset && (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {/** Support both camelCase and snake_case relation keys from API */}
                    {(() => {
                        const typedAsset: any = asset;
                        typedAsset.assetType = typedAsset.assetType || typedAsset.asset_type;
                        return null;
                    })()}
                    <Descriptions title="General Information" bordered column={isMobile ? 1 : 2}>
                        <Descriptions.Item label="Code" span={2}>
                            {asset.is_draft ? <Tag color="orange">DRAFT</Tag> : <Text strong>{asset.asset_code}</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Branch">{asset.branch?.name}</Descriptions.Item>
                        <Descriptions.Item label="Category">{asset.category?.name}</Descriptions.Item>
                        <Descriptions.Item label="Type">{(asset as any).assetType?.name || (asset as any).asset_type?.name || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Model">{asset.model_number}</Descriptions.Item>
                        <Descriptions.Item label="Serial">{asset.serial_number || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Condition">
                            <Tag color={asset.condition === 'poor' ? 'error' : 'processing'}>
                                {asset.condition.toUpperCase()}
                            </Tag>
                        </Descriptions.Item>
                    </Descriptions>

                    <Descriptions title="Financials" bordered column={isMobile ? 1 : 2}>
                        <Descriptions.Item label="Purchase Date">
                            {asset.date_of_purchase ? dayjs(asset.date_of_purchase).format('YYYY-MM-DD') : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Cost">
                            ₱{Number(asset.acquisition_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Descriptions.Item>
                        <Descriptions.Item label="Useful Life">{asset.useful_life_months} Months</Descriptions.Item>
                        <Descriptions.Item label="Monthly Dep.">
                            ₱{Number(asset.monthly_depreciation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Descriptions.Item>
                    </Descriptions>

                    <Descriptions title="Assignment & Remarks" bordered column={1}>
                        <Descriptions.Item label="Assigned To">{asset.assigned_to || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Remarks">{asset.remarks || '-'}</Descriptions.Item>
                    </Descriptions>

                    {(asset.delete_request_status !== 'none' || asset.deleted_at) && (
                        <Descriptions title="Deletion Information" bordered column={isMobile ? 1 : 2}>
                            <Descriptions.Item label="Status">
                                <Tag color={
                                    asset.delete_request_status === 'approved' || asset.deleted_at ? 'error' :
                                        asset.delete_request_status === 'pending' ? 'processing' : 'warning'
                                }>
                                    {asset.deleted_at ? 'DELETED' : asset.delete_request_status.toUpperCase()}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Reason" span={2}>{asset.delete_request_reason || '-'}</Descriptions.Item>

                            {asset.delete_requested_at && (
                                <>
                                    <Descriptions.Item label="Requested By">
                                        {asset.deleteRequester ? `${asset.deleteRequester.first_name} ${asset.deleteRequester.last_name}` : '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Requested Date">
                                        {dayjs(asset.delete_requested_at).format('YYYY-MM-DD HH:mm')}
                                    </Descriptions.Item>
                                </>
                            )}

                            {asset.delete_approved_at && (
                                <>
                                    <Descriptions.Item label="Approved By">
                                        {asset.deleteApprover ? `${asset.deleteApprover.first_name} ${asset.deleteApprover.last_name}` : '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Approved Date">
                                        {dayjs(asset.delete_approved_at).format('YYYY-MM-DD HH:mm')}
                                    </Descriptions.Item>
                                </>
                            )}

                            {asset.deleted_at && (
                                <Descriptions.Item label="Deleted At" span={2}>
                                    {dayjs(asset.deleted_at).format('YYYY-MM-DD HH:mm')}
                                </Descriptions.Item>
                            )}
                        </Descriptions>
                    )}

                    <Collapse defaultActiveKey={[]} ghost>
                        <Collapse.Panel header={<Divider orientation={'left' as any} style={{ margin: 0 }}>Audit History</Divider>} key="audit">
                            <Table
                                dataSource={audits}
                                columns={auditColumns}
                                rowKey="id"
                                pagination={{ pageSize: 5 }}
                                size="small"
                            />
                        </Collapse.Panel>
                    </Collapse>
                </Space>
            )}
        </Drawer>
    );
};

export default AssetDetailsDrawer;
