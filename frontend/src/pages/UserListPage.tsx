import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Card, Input, Select, Modal, message, Form, Tooltip, Upload, Radio, Row, Col } from 'antd';
import type { Breakpoint } from 'antd/es/_util/responsiveObserver';
import type { ColumnsType } from 'antd/es/table';
import {
    UserAddOutlined,
    SearchOutlined,
    ReloadOutlined,
    EditOutlined,
    LockOutlined,
    StopOutlined,
    CheckCircleOutlined,
    DownloadOutlined,
    UploadOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../api/axios';
import type { User, UserRole } from '../types';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { useReferences } from '../hooks/useReferences';
import './UserListPage.css';

const { Option } = Select;

const UserListPage: React.FC = () => {
    const [search, setSearch] = useState('');
    const [role, setRole] = useState<string | undefined>(undefined);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [templateModalVisible, setTemplateModalVisible] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [templateFormat, setTemplateFormat] = useState<'csv' | 'xlsx'>('csv');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuth();
    const { branches, divisions } = useReferences();
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
    const selectedDivisionId = Form.useWatch('division_id', form);
    const selectedBranchName = Form.useWatch('branch', form);
    const selectedRole = Form.useWatch('role', form);

    const { data: users, isLoading, refetch } = useQuery({
        queryKey: ['users', search, role],
        queryFn: async () => {
            const response = await axios.get('/users', {
                params: { search, role }
            });
            return response.data;
        }
    });

    const createUpdateMutation = useMutation({
        mutationFn: async (values: any) => {
            if (editingUser) {
                return axios.put(`/users/${editingUser.id}`, values);
            }
            return axios.post('/users', values);
        },
        onSuccess: () => {
            message.success(`User ${editingUser ? 'updated' : 'created'} successfully`);
            setIsModalVisible(false);
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Verification failed');
        }
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async (userId: number) => {
            return axios.post(`/users/${userId}/toggle-status`);
        },
        onSuccess: () => {
            message.success('User status toggled successfully');
            queryClient.invalidateQueries({ queryKey: ['users'] });
        }
    });

    const resetPasswordMutation = useMutation({
        mutationFn: async (values: any) => {
            return axios.post(`/users/${editingUser?.id}/reset-password`, values);
        },
        onSuccess: () => {
            message.success('Password reset successfully');
            setIsPasswordModalVisible(false);
            passwordForm.resetFields();
        }
    });

    const importMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await axios.post('/users/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        },
        onSuccess: (response) => {
            message.success(response?.message || 'Users imported successfully');
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setImportModalVisible(false);
            setImportFile(null);
        },
        onError: (error: any) => {
            const fallback = 'Import failed. Please check the template and required columns, then try again.';
            message.error(error.response?.data?.message || fallback);
        }
    });

    const handleDownloadTemplate = async () => {
        try {
            const response = await axios.get('/users/import-template', {
                params: { format: templateFormat },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
            link.setAttribute('download', `users_import_template_${timestamp}.${templateFormat}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            message.success('Template downloaded');
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Template download failed');
        }
    };

    const handleEdit = (user: User) => {
        const matchedBranch = branches.data?.find(branch => branch.name === user.branch);
        setEditingUser(user);
        form.setFieldsValue({
            ...user,
            branch: user.branch || (user.role === 'super_admin' || user.role === 'admin' ? 'Head Office' : user.branch),
            division_id: user.division_id ?? matchedBranch?.division_id,
        });
        setIsModalVisible(true);
    };

    const handleAdd = () => {
        setEditingUser(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleResetPassword = (user: User) => {
        setEditingUser(user);
        setIsPasswordModalVisible(true);
    };

    useEffect(() => {
        if (!branches.data?.length || !selectedBranchName) {
            return;
        }
        const branch = branches.data.find(b => b.name === selectedBranchName);
        if (branch?.division_id && form.getFieldValue('division_id') !== branch.division_id) {
            form.setFieldsValue({ division_id: branch.division_id });
        }
    }, [branches.data, selectedBranchName, form]);

    useEffect(() => {
        if (!branches.data?.length) {
            return;
        }
        const branchName = form.getFieldValue('branch');
        if (!branchName || !selectedDivisionId) {
            return;
        }
        const branch = branches.data.find(b => b.name === branchName);
        if (branch?.division_id && branch.division_id !== selectedDivisionId) {
            form.setFieldsValue({ branch: undefined });
        }
    }, [branches.data, selectedDivisionId, form]);

    const responsiveMd: Breakpoint[] = ['md'];
    const columns: ColumnsType<User> = [
        {
            title: 'Name',
            key: 'name',
            render: (user: User) => `${user.first_name} ${user.last_name}`,
        },
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username',
            responsive: responsiveMd,
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            responsive: responsiveMd,
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            responsive: responsiveMd,
            render: (role: UserRole) => {
                const color = role === 'super_admin' ? 'magenta' : role === 'admin' ? 'blue' : 'cyan';
                return (
                    <Tag color={color}>
                        {role.toUpperCase().replace('_', ' ')}
                    </Tag>
                );
            },
        },
        {
            title: 'Division',
            dataIndex: 'division_id',
            key: 'division_id',
            render: (divisionId?: number | null) => {
                const division = divisions.data?.find(d => d.id === divisionId);
                return division?.name || '-';
            },
        },
        {
            title: 'Branch',
            dataIndex: 'branch',
            key: 'branch',
            render: (branch: string) => branch || '-',
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            responsive: responsiveMd,
            render: (isActive: boolean) => (
                <Tag color={isActive ? 'success' : 'error'}>
                    {isActive ? 'ACTIVE' : 'INACTIVE'}
                </Tag>
            ),
        },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            responsive: responsiveMd,
            render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: <span className="user-list__actions-title">Actions</span>,
            key: 'actions',
            className: 'user-list__actions-col',
            render: (_unused: any, user: User) => (
                <Space size="middle" className="user-list__actions">
                    {!(currentUser?.role === 'admin' && user.role === 'super_admin') && (
                        <>
                            <Tooltip title="Edit">
                                <Button
                                    type="text"
                                    icon={<EditOutlined />}
                                    onClick={() => handleEdit(user)}
                                />
                            </Tooltip>
                            <Tooltip title="Reset password">
                                <Button
                                    type="text"
                                    icon={<LockOutlined />}
                                    onClick={() => handleResetPassword(user)}
                                />
                            </Tooltip>
                            {!(currentUser?.role === 'admin' && user.role === 'admin') && (
                                <Tooltip title={user.is_active ? 'Deactivate' : 'Activate'}>
                                    <Button
                                        type="text"
                                        danger={user.is_active}
                                        icon={user.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                                        onClick={() => toggleStatusMutation.mutate(user.id)}
                                    />
                                </Tooltip>
                            )}
                        </>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="user-list">
            <div className="user-list__header">
                <h2 style={{ margin: 0 }} className="user-list__title">User Management</h2>
                <Space wrap className="user-list__header-actions">
                    {isAdmin && (
                        <>
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
                        </>
                    )}
                    <Button
                        type="primary"
                        icon={<UserAddOutlined />}
                        onClick={handleAdd}
                        className="user-list__add-button"
                        size="large"
                    >
                        Add User
                    </Button>
                </Space>
            </div>

            <Card style={{ marginBottom: 16 }}>
                <Space wrap className="user-list__filters">
                    <Input
                        placeholder="Search users..."
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="user-list__filter user-list__filter--search"
                    />
                    <Select
                        placeholder="Select Role"
                        allowClear
                        className="user-list__filter user-list__filter--role"
                        onChange={value => setRole(value)}
                    >
                        {currentUser?.role === 'super_admin' && <Option value="super_admin">Super Admin</Option>}
                        {currentUser?.role === 'super_admin' && <Option value="admin">Admin</Option>}
                        <Option value="branch_custodian">Branch Custodian</Option>
                    </Select>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => refetch()}
                    >
                        Refresh
                    </Button>
                </Space>
            </Card>

            <Table
                columns={columns}
                dataSource={users?.data || []}
                loading={isLoading}
                rowKey="id"
                pagination={{
                    total: users?.total,
                    pageSize: users?.per_page,
                    onChange: (_page) => refetch(), // Simplification, normally use separate state for pagination
                }}
            />

            <Modal
                title={editingUser ? 'Edit User' : 'Create New User'}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                confirmLoading={createUpdateMutation.isPending}
                width={860}
                className="user-list__modal"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={values => createUpdateMutation.mutate(values)}
                >
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="first_name"
                                label="First Name"
                                rules={[{ required: true, message: 'Please enter first name' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="last_name"
                                label="Last Name"
                                rules={[{ required: true, message: 'Please enter last name' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="username"
                                label="Username"
                                rules={[{ required: true, message: 'Please enter username' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="email"
                                label="Email"
                                rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    {!editingUser && (
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="password"
                                    label="Initial Password"
                                    rules={[{ required: true, message: 'Please enter initial password' }]}
                                >
                                    <Input.Password />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="role"
                                label="Role"
                                rules={[{ required: true, message: 'Please select a role' }]}
                            >
                                <Select
                                    onChange={(value) => {
                                        if ((value === 'super_admin' || value === 'admin') && !form.getFieldValue('branch')) {
                                            const headOffice = branches.data?.find(branch => branch.name === 'Head Office');
                                            form.setFieldsValue({
                                                branch: 'Head Office',
                                                division_id: headOffice?.division_id,
                                            });
                                        }
                                    }}
                                >
                                    {currentUser?.role === 'super_admin' && <Option value="super_admin">Super Admin</Option>}
                                    {currentUser?.role === 'super_admin' && <Option value="admin">Admin</Option>}
                                    <Option value="branch_custodian">Branch Custodian</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                    <Form.Item
                        name="division_id"
                        label="Division"
                        rules={[{ required: true, message: 'Please select division' }]}
                    >
                        <Select
                            placeholder="Select division"
                            loading={divisions.isLoading}
                            disabled={!selectedRole}
                                    options={divisions.data?.map(division => ({
                                        label: division.name,
                                        value: division.id,
                                    }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                    <Form.Item
                        name="branch"
                        label="Branch"
                        rules={[{ required: true, message: 'Please select branch' }]}
                    >
                        <Select
                            placeholder="Select branch"
                            loading={branches.isLoading}
                                    disabled={!selectedRole || !selectedDivisionId}
                                    options={selectedDivisionId
                                        ? branches.data
                                            ?.filter(branch => branch.division_id === selectedDivisionId)
                                            .map(branch => ({
                                                label: branch.name,
                                                value: branch.name,
                                            }))
                                        : []}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            <Modal
                title="Reset Password"
                open={isPasswordModalVisible}
                onCancel={() => setIsPasswordModalVisible(false)}
                onOk={() => passwordForm.submit()}
                confirmLoading={resetPasswordMutation.isPending}
            >
                <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={values => resetPasswordMutation.mutate(values)}
                >
                    <Form.Item
                        name="password"
                        label="New Password"
                        rules={[{ required: true, message: 'Please enter new password' }, { min: 8, message: 'Password must be at least 8 characters' }]}
                    >
                        <Input.Password />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Import Users"
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
        </div>
    );
};

export default UserListPage;
