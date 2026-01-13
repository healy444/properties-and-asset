import React, { useState } from 'react';
import { Tabs, Table, Button, Space, Card, Modal, Form, Input, Select, Switch, message, Tooltip, Tag } from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    StopOutlined,
    CheckCircleOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../api/axios';

const { TabPane } = Tabs;

interface ReferenceConfig {
    key: string;
    label: string;
    columns: any[];
    fields: React.ReactNode;
}

const ReferenceManagementPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('branches');
    const [isModalVisible, setIsModalVisible] = useState(false);
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
            if (editingId) {
                return axios.put(`/references/${activeTab}/${editingId}`, values);
            }
            return axios.post(`/references/${activeTab}`, values);
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
            render: (active: boolean) => (
                <Tag color={active ? 'success' : 'error'}>{active ? 'ACTIVE' : 'INACTIVE'}</Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: any) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Tooltip title={record.is_active ? 'Deactivate' : 'Activate'}>
                        <Button
                            type="text"
                            danger={record.is_active}
                            icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                            onClick={() => toggleMutation.mutate(record.id)}
                        />
                    </Tooltip>
                </Space>
            ),
        }
    ];

    const configs: Record<string, ReferenceConfig> = {
        branches: {
            key: 'branches',
            label: 'Branches',
            columns: [
                ...baseColumns.slice(0, 2),
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
                    <Form.Item name="parent_id" label="Parent Branch"><Select allowClear>
                        {branches?.map((b: any) => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
                    </Select></Form.Item>
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
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Reference Data Management</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add New</Button>
            </div>

            <Card>
                <Tabs
                    activeKey={activeTab}
                    onChange={(key) => {
                        setActiveTab(key);
                        refetch();
                    }}
                >
                    {Object.values(configs).map(config => (
                        <TabPane tab={config.label} key={config.key}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                                <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>
                                    Refresh
                                </Button>
                            </div>
                            <Table
                                columns={config.columns}
                                dataSource={records || []}
                                loading={isLoading}
                                rowKey="id"
                                pagination={{ pageSize: 10 }}
                            />
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
        </div>
    );
};

export default ReferenceManagementPage;
