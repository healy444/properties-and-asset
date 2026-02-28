import React, { useState } from 'react';
import { Tabs, Table, Button, Space, Card, Modal, Form, Input, Select, message, Tooltip, Tag, Pagination, Upload, Radio } from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    StopOutlined,
    CheckCircleOutlined,
    ReloadOutlined,
    UploadOutlined,
    DownloadOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../api/axios';
import './ReferenceManagementPage.css';
import useMediaQuery from '../hooks/useMediaQuery';

const { TabPane } = Tabs;

interface ReferenceConfig {
    key: string;
    label: string;
    columns: any[];
    fields: React.ReactNode;
}

const ReferenceManagementPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('branches');
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [templateModalVisible, setTemplateModalVisible] = useState(false);
    const [templateFormat, setTemplateFormat] = useState<'csv' | 'xlsx'>('csv');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    const generateBaseCode = (name?: string) => {
        if (!name) return '';
        const cleaned = name.trim().replace(/\s+/g, ' ');
        if (!cleaned) return '';
        const words = cleaned.split(' ').filter(Boolean);
        const fromInitials = words.map(w => w[0]).join('').toUpperCase().slice(0, 4);
        if (fromInitials.length >= 2) {
            return fromInitials;
        }
        const alnum = cleaned.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return alnum.slice(0, 4);
    };

    const ensureUniqueCode = (baseCode: string, categoryId?: number, excludeId?: number) => {
        if (!baseCode || !categoryId) return baseCode;
        const existingCodes = (records || [])
            .filter((item: any) => item.category_id === categoryId && item.id !== excludeId)
            .map((item: any) => (item.code || '').toString().toUpperCase());

        let candidate = baseCode.toUpperCase().slice(0, 4);
        let suffix = 1;

        while (existingCodes.includes(candidate)) {
            const suffixStr = String(suffix);
            const availableLength = Math.max(1, 4 - suffixStr.length);
            candidate = `${baseCode.slice(0, availableLength)}${suffixStr}`.toUpperCase();
            suffix += 1;
        }

        return candidate;
    };

    const handleAutoCode = (allValues: any) => {
        if (activeTab !== 'asset-types') return;
        const base = generateBaseCode(allValues?.name);
        const unique = ensureUniqueCode(base, allValues?.category_id, editingId || undefined);

        if (!base) {
            form.setFieldsValue({ code: undefined });
            return;
        }

        if (unique !== form.getFieldValue('code')) {
            form.setFieldsValue({ code: unique });
        }
    };

    const { data: records, isLoading, refetch } = useQuery({
        queryKey: ['references', activeTab],
        queryFn: async () => {
            const response = await axios.get(`/references/${activeTab}`);
            return response.data;
        }
    });

    const { data: categories } = useQuery({
        queryKey: ['references', 'categories', 'dropdown'],
        queryFn: async () => {
            const response = await axios.get('/references/categories', { params: { active: 1 } });
            return response.data;
        },
        enabled: activeTab === 'asset-types'
    });

    const { data: divisions } = useQuery({
        queryKey: ['references', 'divisions', 'dropdown'],
        queryFn: async () => {
            const response = await axios.get('/references/divisions', { params: { active: 1 } });
            return response.data;
        },
        enabled: activeTab === 'branches' || activeTab === 'divisions'
    });

    const { data: branches } = useQuery({
        queryKey: ['references', 'branches', 'dropdown'],
        queryFn: async () => {
            const response = await axios.get('/references/branches', { params: { active: 1 } });
            return response.data;
        },
        enabled: activeTab === 'branches'
    });

    const mutation = useMutation({
        mutationFn: async (values: any) => {
            const payload = { ...values };
            if (activeTab === 'branches' && payload.parent_id === undefined) {
                payload.parent_id = null;
            }
            if (editingId) {
                return axios.put(`/references/${activeTab}/${editingId}`, payload);
            }
            return axios.post(`/references/${activeTab}`, payload);
        },
        onSuccess: () => {
            message.success('Success');
            setIsModalVisible(false);
            queryClient.invalidateQueries({ queryKey: ['references', activeTab] });
        },
        onError: (error: any) => {
            message.error(error.response?.data?.error || 'Operation failed');
        }
    });

    const toggleMutation = useMutation({
        mutationFn: async (id: number) => {
            return axios.post(`/references/${activeTab}/${id}/toggle-status`);
        },
        onSuccess: () => {
            message.success('Status updated');
            queryClient.invalidateQueries({ queryKey: ['references', activeTab] });
        }
    });

    const importMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await axios.post(`/references/${activeTab}/import`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        },
        onSuccess: (response) => {
            message.success(response?.message || 'Import completed');
            queryClient.invalidateQueries({ queryKey: ['references', activeTab] });
            setImportModalVisible(false);
            setImportFile(null);
        },
        onError: (error: any) => {
            const fallback = 'Import failed. Please check the file format and required columns.';
            message.error(error.response?.data?.message || fallback);
        }
    });

    const handleDownloadTemplate = async () => {
        try {
            const response = await axios.get(`/references/${activeTab}/import-template`, {
                params: { format: templateFormat },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
            link.setAttribute('download', `${activeTab}_import_template_${timestamp}.${templateFormat}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            message.success('Template downloaded');
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Template download failed');
        }
    };

    const handleAdd = () => {
        setEditingId(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record: any) => {
        setEditingId(record.id);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const renderStatusTag = (active: boolean) => (
        <Tag color={active ? 'success' : 'error'}>{active ? 'ACTIVE' : 'INACTIVE'}</Tag>
    );

    const renderRowActions = (record: any) => (
        <Space>
            <Tooltip title="Edit">
                <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
            </Tooltip>
            <Tooltip title={record.is_active ? 'Deactivate' : 'Activate'}>
                <Button
                    type="text"
                    danger={record.is_active}
                    icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                    onClick={() => toggleMutation.mutate(record.id)}
                />
            </Tooltip>
        </Space>
    );

    const baseColumns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a: any, b: any) => a.name.localeCompare(b.name),
        },
        {
            title: 'Code',
            dataIndex: 'code',
            key: 'code',
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (active: boolean) => renderStatusTag(active),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: any) => renderRowActions(record),
        }
    ];

    const configs: Record<string, ReferenceConfig> = {
        divisions: {
            key: 'divisions',
            label: 'Divisions',
            columns: baseColumns,
            fields: (
                <>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="code" label="Code" rules={[{ required: true }]}><Input /></Form.Item>
                </>
            )
        },
        branches: {
            key: 'branches',
            label: 'Branches',
            columns: [
                ...baseColumns.slice(0, 2),
                {
                    title: 'Division',
                    dataIndex: ['division', 'name'],
                    key: 'division',
                    render: (text: string) => text || '-',
                },
                {
                    title: 'Parent',
                    dataIndex: ['parent', 'name'],
                    key: 'parent',
                    render: (text: string) => text || '-',
                },
                ...baseColumns.slice(2)
            ],
            fields: (
                <>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="code" label="Code" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="division_id" label="Division" rules={[{ required: true }]}>
                        <Select>
                            {divisions?.map((d: any) => <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="parent_id" label="Parent Branch">
                        <Select
                            allowClear
                            onClear={() => form.setFieldsValue({ parent_id: null })}
                        >
                        {branches?.map((b: any) => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
                        </Select>
                    </Form.Item>
                </>
            )
        },
        categories: {
            key: 'categories',
            label: 'Categories',
            columns: baseColumns,
            fields: (
                <>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="code" label="Code" rules={[{ required: true }]}><Input /></Form.Item>
                </>
            )
        },
        'asset-types': {
            key: 'asset-types',
            label: 'Asset Types',
            columns: [
                ...baseColumns.slice(0, 2),
                {
                    title: 'Category',
                    dataIndex: ['category', 'name'],
                    key: 'category',
                },
                ...baseColumns.slice(2)
            ],
            fields: (
                <>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="code" label="Code" rules={[{ required: true }]}>
                        <Input disabled placeholder="Auto-generated from name" />
                    </Form.Item>
                    <Form.Item name="category_id" label="Category" rules={[{ required: true }]}><Select>
                        {categories?.map((c: any) => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
                    </Select></Form.Item>
                </>
            )
        },
        brands: {
            key: 'brands',
            label: 'Brands',
            columns: [
                { title: 'Name', dataIndex: 'name', key: 'name' },
                baseColumns[2],
                baseColumns[3]
            ],
            fields: (
                <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
            )
        },
        suppliers: {
            key: 'suppliers',
            label: 'Suppliers',
            columns: [
                { title: 'Name', dataIndex: 'name', key: 'name' },
                { title: 'Contact', dataIndex: 'contact_person', key: 'contact' },
                { title: 'Email', dataIndex: 'email', key: 'email' },
                baseColumns[2],
                baseColumns[3]
            ],
            fields: (
                <>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="contact_person" label="Contact Person"><Input /></Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item>
                    <Form.Item name="phone" label="Phone"><Input /></Form.Item>
                    <Form.Item name="address" label="Address"><Input.TextArea /></Form.Item>
                </>
            )
        }
    };

    return (
        <div className="reference-management">
            <div style={{ marginBottom: 16 }}>
                <h2 style={{ margin: 0 }} className="reference-management__title">Reference Data Management</h2>
            </div>

            <Card>
                {isMobile && (
                    <Select
                        value={activeTab}
                        onChange={(key) => {
                            setActiveTab(key);
                            refetch();
                        }}
                        className="reference-management__tab-select"
                        options={Object.values(configs).map((config) => ({
                            label: config.label,
                            value: config.key,
                        }))}
                    />
                )}
                <Tabs
                    activeKey={activeTab}
                    tabBarStyle={isMobile ? { display: 'none' } : undefined}
                    onChange={(key) => {
                        setActiveTab(key);
                        refetch();
                    }}
                >
                    {Object.values(configs).map(config => (
                        <TabPane tab={config.label} key={config.key}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                                <Space wrap>
                                    <Button
                                        icon={<UploadOutlined />}
                                        loading={importMutation.isPending}
                                        onClick={() => setImportModalVisible(true)}
                                    >
                                        Import
                                    </Button>
                                    <Button
                                        icon={<DownloadOutlined />}
                                        onClick={() => setTemplateModalVisible(true)}
                                    >
                                        Template
                                    </Button>
                                    <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>
                                        Refresh
                                    </Button>
                                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="reference-management__add">
                                        Add New
                                    </Button>
                                </Space>
                            </div>
                            {isMobile ? (
                                <div className="reference-management__cards">
                                    {(records || []).map((record: any) => (
                                        <Card key={record.id} size="small" className="reference-management__card">
                                            <div className="reference-management__card-row">
                                                <strong>{record.name}</strong>
                                                {renderStatusTag(record.is_active)}
                                            </div>
                                            <div className="reference-management__card-row">
                                                <span className="reference-management__card-meta">
                                                    {record.code || '-'}
                                                </span>
                                                {record.parent?.name && (
                                                    <span className="reference-management__card-meta">
                                                        {record.parent.name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="reference-management__card-row">
                                                <div className="reference-management__card-actions">
                                                    {renderRowActions(record)}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                    <div className="reference-management__pagination">
                                        <Pagination
                                            current={records?.current_page}
                                            pageSize={records?.per_page || 10}
                                            total={records?.total}
                                            onChange={() => refetch()}
                                            size="small"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <Table
                                    columns={config.columns}
                                    dataSource={records || []}
                                    loading={isLoading}
                                    rowKey="id"
                                    pagination={{ pageSize: 10 }}
                                />
                            )}
                        </TabPane>
                    ))}
                </Tabs>
            </Card>

            <Modal
                title={`${editingId ? 'Edit' : 'Add'} ${configs[activeTab].label}`}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                confirmLoading={mutation.isPending}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={values => mutation.mutate(values)}
                    onValuesChange={(_changed, allValues) => handleAutoCode(allValues)}
                >
                    {configs[activeTab].fields}
                </Form>
            </Modal>

            <Modal
                title={`Import ${configs[activeTab].label}`}
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
                title={`Download ${configs[activeTab].label} Template`}
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
        </div>
    );
};

export default ReferenceManagementPage;
