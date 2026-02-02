import React, { useEffect, useState } from 'react';
import { Table, Card, Input, Select, Button, Space, Tag, Typography, message, Badge, Modal, Radio, Upload, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, DownloadOutlined, RollbackOutlined, UploadOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import type { Asset } from '../types';
import { useReferences } from '../hooks/useReferences';
import { useAuth } from '../context/AuthContext';
import AssetDetailsDrawer from '../components/AssetDetailsDrawer';

const { Title } = Typography;
const { confirm } = Modal;

const AssetListPage: React.FC = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { branches, categories } = useReferences();
    const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [exportModalVisible, setExportModalVisible] = useState(false);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [templateModalVisible, setTemplateModalVisible] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
    const [exportType, setExportType] = useState<'table' | 'sticker'>('table');
    const [templateFormat, setTemplateFormat] = useState<'csv' | 'xlsx'>('csv');

    const initialStatus = searchParams.get('status') || undefined;

    const [params, setParams] = useState({
        page: 1,
        per_page: 10,
        search: '',
        branch_id: undefined as number | undefined,
        category_id: undefined as number | undefined,
        status: (initialStatus as any) ?? 'active',
        deletion_view: undefined as 'pending' | 'all' | undefined,
    });

    const isBranchCustodian = user?.role === 'branch_custodian';
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    const branchIdForUser = branches.data?.find(b => b.name === user?.branch)?.id;

    useEffect(() => {
        if (!isBranchCustodian || !branchIdForUser) {
            return;
        }
        setParams(prev => {
            if (prev.branch_id === branchIdForUser) {
                return prev;
            }
            return { ...prev, branch_id: branchIdForUser, page: 1 };
        });
    }, [isBranchCustodian, branchIdForUser]);

    const { data, isLoading } = useQuery({
        queryKey: ['assets', params],
        queryFn: () => api.get('/assets', { params }).then(res => res.data),
    });

    const approveMutation = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) =>
            api.post(`/assets/${id}/approve-delete`, { reason }),
        onSuccess: () => {
            message.success('Asset deletion approved');
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Approval failed');
        },
    });

    const approveReviewMutation = useMutation({
        mutationFn: (id: number) => api.post(`/assets/${id}/finalize-draft`),
        onSuccess: () => {
            message.success('Asset approved and finalized');
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Approval failed');
        },
    });

    const rejectReviewMutation = useMutation({
        mutationFn: (id: number) => api.post(`/assets/${id}/reject-review`),
        onSuccess: () => {
            message.success('Review rejected');
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Rejection failed');
        },
    });

    const directDeleteMutation = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) => api.post(`/assets/${id}/approve-delete`, { reason }),
        onSuccess: () => {
            message.success('Asset deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Delete failed');
        },
    });

    const rejectMutation = useMutation({
        mutationFn: (id: number) => api.post(`/assets/${id}/reject-delete`),
        onSuccess: () => {
            message.success('Deletion request rejected');
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
    });

    const restoreMutation = useMutation({
        mutationFn: (id: number) => api.post(`/assets/${id}/restore`),
        onSuccess: () => {
            message.success('Asset restored successfully');
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Restore failed');
        },
    });

    const requestDeleteMutation = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) =>
            api.post(`/assets/${id}/request-delete`, { reason }),
        onSuccess: () => {
            message.success('Deletion request sent to admin');
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
    });

    const exportMutation = useMutation({
        mutationFn: async (format: 'csv' | 'xlsx') => {
            const response = await api.get('/assets/export', {
                params: {
                    ...params,
                    page: undefined,
                    per_page: undefined,
                    format,
                },
                responseType: 'blob',
            });
            return response;
        },
        onSuccess: (response, format) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
            link.setAttribute('download', `assets_export_${timestamp}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            message.success('Assets exported successfully');
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Export failed');
        },
    });

    const importMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await api.post('/assets/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        },
        onSuccess: (response) => {
            message.success(response?.message || 'Assets imported successfully');
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            setImportModalVisible(false);
            setImportFile(null);
        },
        onError: () => {
            const fallback = 'Import failed. Please check the template and required columns, then try again.';
            message.error(fallback);
        },
    });

    const handleStickerExport = async () => {
        try {
            const { data: payload } = await api.get('/assets', {
                params: { ...params, page: 1, per_page: 10000 },
            });
            const assets = payload?.data || [];
            if (!assets.length) {
                message.warning('No assets found for current filters.');
                return;
            }

            const formatDate = (d: any) => d ? String(d).split('T')[0] : '-';
            const tagsHtml = assets.map((asset: any) => {
                const typeName = asset.assetType?.name || asset.asset_type?.name || '-';
                const categoryName = asset.category?.name || asset.category_name || asset.category?.title || '-';
                const branchName = asset.branch?.name || asset.branch_name || '-';
                const condition = (asset.condition || '').toUpperCase() || '-';
                const cost = Number(asset.acquisition_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const dep = Number(asset.monthly_depreciation || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return `
  <div class="tag">
    <table class="info">
      <tr><th>Code</th><td colspan="3" class="code">${asset.asset_code || 'DRAFT'}</td></tr>
      <tr><th>Branch</th><td>${branchName}</td><th>Category</th><td>${categoryName}</td></tr>
      <tr><th>Type</th><td>${typeName}</td><th>Model</th><td>${asset.model_number || '-'}</td></tr>
      <tr><th>Serial</th><td>${asset.serial_number || '-'}</td><th>Condition</th><td>${condition}</td></tr>
      <tr><th>Purchase Date</th><td>${formatDate(asset.date_of_purchase)}</td><th>Cost</th><td>PHP ${cost}</td></tr>
      <tr><th>Useful Life</th><td>${asset.useful_life_months || '-'} Months</td><th>Monthly Dep.</th><td>PHP ${dep}</td></tr>
    </table>
  </div>`;
            }).join('');

            const html = `
<!DOCTYPE html>
<html>
<head>
<style>
@page { size: letter; margin: 8mm; }
body { font-family: Arial, sans-serif; margin: 0; padding: 8mm; }
.sheet-wrap { transform-origin: top left; }
.sheet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm 8mm; }
.tag {
  box-sizing: border-box;
  border: 1px solid #dcdfe6;
  border-radius: 12px;
  padding: 10px;
  page-break-inside: avoid;
}
.info { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px; }
.info th { width: 28%; text-align: left; padding: 6px 8px; color: #666; font-weight: 600; background: #fafafa; border: 1px solid #edf0f5; }
.info td { padding: 6px 8px; border: 1px solid #edf0f5; }
.code { font-weight: 700; font-size: 14px; }
.section-title { font-weight: 700; margin: 6px 0 4px; font-size: 13px; }
</style>
</head>
<body>
<div class="sheet-wrap">
  <div class="sheet">
  ${tagsHtml}
  </div>
</div>
<script>window.print();</script>
</body>
</html>`;

            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (!win) {
                message.error('Popup blocked. Please allow popups to export.');
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Sticker export failed');
        }
    };

    const handleExportConfirm = () => {
        if (exportType === 'table') {
            exportMutation.mutate(exportFormat);
        } else {
            handleStickerExport();
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('/assets/import-template', {
                params: { format: templateFormat },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
            link.setAttribute('download', `assets_import_template_${timestamp}.${templateFormat}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            message.success('Template downloaded');
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Template download failed');
        }
    };

    const handleRequestDelete = (id: number) => {
        // Admin/super admin: direct delete (no request flow)
        if (user?.role === 'admin' || user?.role === 'super_admin') {
            let reason = '';
            confirm({
                title: 'Delete Asset?',
                icon: <ExclamationCircleOutlined />,
                content: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>Provide a reason for deleting this asset.</div>
                        <Input.TextArea
                            autoSize={{ minRows: 3, maxRows: 5 }}
                            placeholder="Reason for deletion (required)"
                            onChange={(e) => { reason = e.target.value; }}
                        />
                    </div>
                ),
                okText: 'Delete',
                okButtonProps: { danger: true },
                onOk() {
                    if (!reason || reason.trim().length < 5) {
                        message.error('Please provide a reason (min 5 characters).');
                        return Promise.reject();
                    }
                    return directDeleteMutation.mutateAsync({ id, reason: reason.trim() });
                },
            });
            return;
        }

        // Branch custodian: send a deletion request with reason.
        let reason = '';
        confirm({
            title: 'Request Asset Deletion?',
            icon: <ExclamationCircleOutlined />,
            content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>This will notify an administrator for approval.</div>
                    <Input.TextArea
                        autoSize={{ minRows: 3, maxRows: 5 }}
                        placeholder="Reason for deletion (required)"
                        onChange={(e) => { reason = e.target.value; }}
                    />
                </div>
            ),
            okText: 'Send Request',
            onOk() {
                if (!reason || reason.trim().length < 5) {
                    message.error('Please provide a reason (min 5 characters).');
                    return Promise.reject();
                }
                return requestDeleteMutation.mutateAsync({ id, reason: reason.trim() });
            },
        });
    };

    const columns = [
        {
            title: 'Code',
            dataIndex: 'asset_code',
            key: 'asset_code',
            render: (code: string, record: Asset) => (
                record.is_draft ? <Tag color="orange">DRAFT</Tag> : <b>{code}</b>
            ),
        },
        {
            title: 'Type',
            key: 'asset_type',
            render: (_: any, record: Asset) => (record.assetType?.name || (record as any).asset_type?.name || '-'),
        },
        {
            title: 'Branch',
            dataIndex: ['branch', 'name'],
            key: 'branch',
        },
        {
            title: 'Category',
            dataIndex: ['category', 'name'],
            key: 'category',
        },
        {
            title: 'Cost',
            dataIndex: 'acquisition_cost',
            key: 'acquisition_cost',
            render: (cost: number) => `₱${Number(cost).toLocaleString()}`,
        },
        {
            title: 'Condition',
            dataIndex: 'condition',
            key: 'condition',
            render: (condition: string) => <Tag color={condition === 'poor' ? 'error' : 'processing'}>{condition.toUpperCase()}</Tag>,
        },
        {
            title: 'Status',
            key: 'status',
            render: (_unused: any, record: Asset) => {
                if (record.delete_request_status === 'pending') {
                    return <Badge status="error" text="Pending Delete" />;
                }
                if (record.delete_request_status === 'approved') {
                    return <Badge status="success" text="Deletion Approved" />;
                }
                if (record.delete_request_status === 'rejected') {
                    return <Badge status="warning" text="Deletion Rejected" />;
                }
                if (record.is_draft && record.submitted_for_review_at) {
                    return <Badge status="processing" text={isAdmin ? 'Pending Review' : 'Submitted for Review'} />;
                }
                if (record.is_draft) {
                    return <Badge status="warning" text="Draft" />;
                }
                if (record.asset_status === 'inactive') {
                    return <Badge status="default" text="Inactive" />;
                }
                return <Badge status="success" text="Active" />;
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_unused: any, record: Asset) => {
                const isDeleted = !!(record as any).deleted_at;

                if (isDeleted) {
                    return (
                        <Space>
                            <Tooltip title="View details">
                                <Button
                                    icon={<EyeOutlined />}
                                    size="small"
                                    onClick={() => {
                                        setSelectedAssetId(record.id);
                                        setDrawerVisible(true);
                                    }}
                                />
                            </Tooltip>
                            {user?.role === 'super_admin' && (
                                <Tooltip title="Restore asset">
                                    <Button
                                        icon={<RollbackOutlined />}
                                        size="small"
                                        type="primary"
                                        onClick={() =>
                                            confirm({
                                                title: 'Restore asset?',
                                                icon: <ExclamationCircleOutlined />,
                                                content: 'This will restore the asset and clear its deletion request.',
                                                onOk() {
                                                    return restoreMutation.mutateAsync(record.id);
                                                },
                                            })
                                        }
                                        loading={restoreMutation.isPending}
                                    />
                                </Tooltip>
                            )}
                        </Space>
                    );
                }

                return (
                    <Space>
                        <Tooltip title="View details">
                            <Button
                                icon={<EyeOutlined />}
                                size="small"
                                onClick={() => {
                                    setSelectedAssetId(record.id);
                                    setDrawerVisible(true);
                                }}
                            />
                        </Tooltip>
                        <Tooltip title="Edit asset">
                            <Button
                                icon={<EditOutlined />}
                                size="small"
                                onClick={() => navigate(`/assets/${record.id}/edit`)}
                            />
                        </Tooltip>
                        {record.delete_request_status === 'pending' && (user?.role === 'admin' || user?.role === 'super_admin') && (
                            <>
                                <Tooltip title="Approve deletion">
                                    <Button
                                        icon={<CheckCircleOutlined />}
                                        size="small"
                                        type="primary"
                                        ghost
                                        onClick={() => {
                                            let reason = '';
                                            confirm({
                                                title: 'Approve Deletion?',
                                                icon: <ExclamationCircleOutlined />,
                                                content: (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        <div>Provide a reason for approving this deletion.</div>
                                                        <Input.TextArea
                                                            autoSize={{ minRows: 3, maxRows: 5 }}
                                                            placeholder="Reason for approval (required)"
                                                            onChange={(e) => { reason = e.target.value; }}
                                                        />
                                                    </div>
                                                ),
                                                okText: 'Approve',
                                                onOk() {
                                                    if (!reason || reason.trim().length < 5) {
                                                        message.error('Please provide a reason (min 5 characters).');
                                                        return Promise.reject();
                                                    }
                                                    return approveMutation.mutateAsync({ id: record.id, reason: reason.trim() });
                                                },
                                            });
                                        }}
                                    />
                                </Tooltip>
                                <Tooltip title="Reject deletion">
                                    <Button
                                        icon={<CloseCircleOutlined />}
                                        size="small"
                                        danger
                                        ghost
                                        onClick={() => rejectMutation.mutate(record.id)}
                                    />
                                </Tooltip>
                            </>
                        )}
                        {record.is_draft && record.submitted_for_review_at && isAdmin && (
                            <>
                                <Tooltip title="Approve review">
                                    <Button
                                        icon={<CheckCircleOutlined />}
                                        size="small"
                                        type="primary"
                                        ghost
                                        onClick={() => approveReviewMutation.mutate(record.id)}
                                    />
                                </Tooltip>
                                <Tooltip title="Reject review">
                                    <Button
                                        icon={<CloseCircleOutlined />}
                                        size="small"
                                        danger
                                        ghost
                                        onClick={() => rejectReviewMutation.mutate(record.id)}
                                    />
                                </Tooltip>
                            </>
                        )}
                        {record.delete_request_status === 'none' && !record.is_draft && (
                            <Tooltip title="Request deletion">
                                <Button
                                    icon={<DeleteOutlined />}
                                    size="small"
                                    danger
                                    onClick={() => handleRequestDelete(record.id)}
                                />
                            </Tooltip>
                        )}
                    </Space>
                );
            },
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Title level={2} style={{ margin: 0 }}>Asset Management</Title>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={() => navigate('/assets/new')}
                    >
                        Add New Asset
                    </Button>
                </div>
            </div>

            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div />
                    <Space>
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={() => setTemplateModalVisible(true)}
                        >
                            Template
                        </Button>
                        <Button
                            icon={<UploadOutlined />}
                            loading={importMutation.isPending}
                            onClick={() => setImportModalVisible(true)}
                        >
                            Import
                        </Button>
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={() => setExportModalVisible(true)}
                        >
                            Export
                        </Button>
                    </Space>
                </div>
                <Space wrap style={{ marginBottom: 16 }}>
                    <Input
                        placeholder="Search by code, model..."
                        prefix={<SearchOutlined />}
                        style={{ width: 250 }}
                        value={params.search}
                        onChange={(e) => setParams({ ...params, search: e.target.value })}
                    />
                    <Select
                        placeholder="Branch"
                        style={{ width: 150 }}
                        allowClear={!isBranchCustodian}
                        disabled={isBranchCustodian}
                        options={branches.data?.map(b => ({ label: b.name, value: b.id }))}
                        value={params.branch_id}
                        onChange={(val) => setParams({ ...params, branch_id: val })}
                    />
                    <Select
                        placeholder="Category"
                        style={{ width: 150 }}
                        allowClear
                        options={categories.data?.map(c => ({ label: c.name, value: c.id }))}
                        onChange={(val) => setParams({ ...params, category_id: val })}
                    />
                    <Select
                        placeholder="Status"
                        style={{ width: 170 }}
                        allowClear
                        options={[
                            { label: 'Active (Default)', value: 'active' },
                            { label: 'Inactive', value: 'inactive' },
                            { label: 'Draft', value: 'draft' },
                            ...((isAdmin || isBranchCustodian) ? [{ label: isAdmin ? 'Pending Review' : 'Submitted for Review', value: 'pending_review' }] : []),
                            ...(isAdmin ? [{ label: 'Deletion Requests / Trash', value: 'deletion' }] : []),
                        ]}
                        value={
                            params.deletion_view === 'all'
                                ? 'deletion'
                                : params.status === 'pending_review'
                                    ? 'pending_review'
                                : params.status === 'draft'
                                    ? 'draft'
                                    : params.status === 'inactive'
                                        ? 'inactive'
                                        : 'active'
                        }
                        onChange={(val) => {
                            if (val === 'pending_review') {
                                setParams({ ...params, status: 'pending_review' as any, deletion_view: undefined, page: 1 });
                                return;
                            }
                            if (val === 'draft') {
                                setParams({ ...params, status: 'draft' as any, deletion_view: undefined, page: 1 });
                                return;
                            }
                            if (val === 'inactive') {
                                setParams({ ...params, status: 'inactive' as any, deletion_view: undefined, page: 1 });
                                return;
                            }
                            if (val === 'deletion' && (user?.role === 'admin' || user?.role === 'super_admin')) {
                                setParams({ ...params, status: undefined as any, deletion_view: 'all', page: 1 });
                                return;
                            }
                            // Default to active
                            setParams({ ...params, status: 'active' as any, deletion_view: undefined, page: 1 });
                        }}
                    />
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                            setParams(prev => ({
                                ...prev,
                                page: 1,
                                search: '',
                                branch_id: isBranchCustodian ? branchIdForUser : undefined,
                                category_id: undefined,
                                status: 'active' as any,
                                deletion_view: undefined,
                            }));
                        }}
                    >
                        Refresh
                    </Button>
                </Space>

                <Table
                    columns={columns}
                    dataSource={data?.data}
                    loading={isLoading}
                    rowKey="id"
                    pagination={{
                        current: data?.current_page,
                        pageSize: data?.per_page,
                        total: data?.total,
                        onChange: (page) => setParams({ ...params, page }),
                    }}
                />
            </Card>

            <AssetDetailsDrawer
                id={selectedAssetId}
                visible={drawerVisible}
                onClose={() => setDrawerVisible(false)}
            />

            <Modal
                title="Export Options"
                open={exportModalVisible}
                onCancel={() => setExportModalVisible(false)}
                onOk={handleExportConfirm}
                confirmLoading={exportMutation.isPending}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Radio.Group
                        onChange={(e) => setExportType(e.target.value)}
                        value={exportType}
                    >
                        <Radio value="table">Table Export (CSV / XLSX)</Radio>
                        <Radio value="sticker">Sticker Tagging (PDF via print)</Radio>
                    </Radio.Group>

                    {exportType === 'table' && (
                        <div>
                            <div style={{ marginBottom: 8, fontWeight: 500 }}>File format</div>
                            <Radio.Group
                                onChange={(e) => setExportFormat(e.target.value)}
                                value={exportFormat}
                            >
                                <Radio value="csv">CSV</Radio>
                                <Radio value="xlsx">XLSX</Radio>
                            </Radio.Group>
                        </div>
                    )}

                    {exportType === 'sticker' && (
                        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                            Exports all filtered assets into a printable tag layout (Letter). Use the browser print dialog to save as PDF.
                        </Typography.Paragraph>
                    )}
                </Space>
            </Modal>

            <Modal
                title="Import Assets"
                open={importModalVisible}
                onCancel={() => {
                    setImportModalVisible(false);
                    setImportFile(null);
                }}
                onOk={() => {
                    if (!importFile) {
                        message.error('Please select a file to upload.');
                        return;
                    }
                    importMutation.mutate(importFile);
                }}
                okText="Upload"
                confirmLoading={importMutation.isPending}
                okButtonProps={{ disabled: !importFile }}
            >
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <Upload.Dragger
                        accept=".csv,.xlsx,.xls"
                        multiple={false}
                        beforeUpload={(file) => {
                            setImportFile(file);
                            return false;
                        }}
                        fileList={importFile ? [{
                            uid: importFile.name,
                            name: importFile.name,
                            status: 'done',
                        }] : []}
                        onRemove={() => {
                            setImportFile(null);
                            return true;
                        }}
                    >
                        <p className="ant-upload-drag-icon">
                            <UploadOutlined />
                        </p>
                        <p className="ant-upload-text">Drag and drop your file here</p>
                        <p className="ant-upload-hint">Or click to browse. Accepted formats: CSV, XLSX.</p>
                    </Upload.Dragger>

                </Space>
            </Modal>

            <Modal
                title="Download Template"
                open={templateModalVisible}
                onCancel={() => setTemplateModalVisible(false)}
                onOk={handleDownloadTemplate}
                okText="Download"
            >
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                        <div style={{ marginBottom: 8, fontWeight: 500 }}>Choose file format</div>
                        <Radio.Group
                            onChange={(e) => setTemplateFormat(e.target.value)}
                            value={templateFormat}
                        >
                            <Radio value="csv">CSV</Radio>
                            <Radio value="xlsx">XLSX</Radio>
                        </Radio.Group>
                    </div>
                </Space>
            </Modal>
        </Space>
    );
};

export default AssetListPage;
