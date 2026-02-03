import React, { useState } from 'react';
import { Table, Button, Tag, Space, Card, Input, Select, Modal, message, Form, Switch, Tooltip } from 'antd';
import {
    UserAddOutlined,
    SearchOutlined,
    ReloadOutlined,
    EditOutlined,
    LockOutlined,
    StopOutlined,
    CheckCircleOutlined
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
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuth();
    const { branches } = useReferences();

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

    const handleEdit = (user: User) => {
        setEditingUser(user);
        form.setFieldsValue({
            ...user,
            branch: user.branch || (user.role === 'super_admin' || user.role === 'admin' ? 'Head Office' : user.branch),
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

    const columns = [
        {
            title: 'Name',
            key: 'name',
            render: (user: User) => `${user.first_name} ${user.last_name}`,
        },
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username',
            responsive: ['md'],
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            responsive: ['md'],
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            responsive: ['md'],
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
            title: 'Branch',
            dataIndex: 'branch',
            key: 'branch',
            render: (branch: string) => branch || '-',
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            responsive: ['md'],
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
            responsive: ['md'],
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
                <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={handleAdd}
                    className="user-list__add-button"
                    size="large"
                >
                    Add User
                </Button>
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
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={values => createUpdateMutation.mutate(values)}
                >
                    <Form.Item
                        name="first_name"
                        label="First Name"
                        rules={[{ required: true, message: 'Please enter first name' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="last_name"
                        label="Last Name"
                        rules={[{ required: true, message: 'Please enter last name' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="username"
                        label="Username"
                        rules={[{ required: true, message: 'Please enter username' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}
                    >
                        <Input />
                    </Form.Item>
                    {!editingUser && (
                        <Form.Item
                            name="password"
                            label="Initial Password"
                            rules={[{ required: true, message: 'Please enter initial password' }]}
                        >
                            <Input.Password />
                        </Form.Item>
                    )}
                    <Form.Item
                        name="role"
                        label="Role"
                        rules={[{ required: true, message: 'Please select a role' }]}
                    >
                        <Select
                            onChange={(value) => {
                                if ((value === 'super_admin' || value === 'admin') && !form.getFieldValue('branch')) {
                                    form.setFieldsValue({ branch: 'Head Office' });
                                }
                            }}
                        >
                            {currentUser?.role === 'super_admin' && <Option value="super_admin">Super Admin</Option>}
                            {currentUser?.role === 'super_admin' && <Option value="admin">Admin</Option>}
                            <Option value="branch_custodian">Branch Custodian</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role}
                    >
                        {({ getFieldValue }) => {
                            const role = getFieldValue('role');
                            if (!role) {
                                return null;
                            }
                            return (
                                <Form.Item
                                    name="branch"
                                    label="Branch"
                                    rules={[{ required: role === 'branch_custodian', message: 'Please select branch' }]}
                                >
                                    <Select
                                        placeholder="Select branch"
                                        loading={branches.isLoading}
                                        options={branches.data?.map(branch => ({
                                            label: branch.name,
                                            value: branch.name,
                                        }))}
                                    />
                                </Form.Item>
                            );
                        }}
                    </Form.Item>
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
        </div>
    );
};

export default UserListPage;
