import React, { useState } from 'react';
import { Form, Input, Button, Card, Row, Col, Typography, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const { Title, Text } = Typography;

const ProfilePage: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [profileForm] = Form.useForm();
    const [passwordForm] = Form.useForm();

    const onUpdateProfile = async (values: any) => {
        setProfileLoading(true);
        try {
            await api.put('/profile', values);
            message.success('Profile updated successfully');
            await refreshUser();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setProfileLoading(false);
        }
    };

    const onChangePassword = async (values: any) => {
        setPasswordLoading(true);
        try {
            await api.post('/profile/change-password', {
                current_password: values.current_password,
                new_password: values.new_password,
                new_password_confirmation: values.new_password_confirmation,
            });
            message.success('Password changed successfully');
            passwordForm.resetFields();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <Title level={2}>Account Settings</Title>
            <Text type="secondary">Manage your personal information and security settings.</Text>

            <Divider />

            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <Card
                        title={<span><UserOutlined /> Personal Information</span>}
                        bordered={false}
                        className="shadow-sm"
                    >
                        <Form
                            form={profileForm}
                            layout="vertical"
                            initialValues={user || {}}
                            onFinish={onUpdateProfile}
                        >
                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <Form.Item
                                        label="First Name"
                                        name="first_name"
                                        rules={[{ required: true, message: 'Please input your first name!' }]}
                                    >
                                        <Input prefix={<UserOutlined />} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item
                                        label="Last Name"
                                        name="last_name"
                                        rules={[{ required: true, message: 'Please input your last name!' }]}
                                    >
                                        <Input prefix={<UserOutlined />} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <Form.Item
                                        label="Middle Name"
                                        name="middle_name"
                                    >
                                        <Input prefix={<UserOutlined />} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item
                                        label="Suffix"
                                        name="suffix"
                                    >
                                        <Input placeholder="e.g. Jr., III" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                label="Email Address"
                                name="email"
                                rules={[
                                    { required: true, message: 'Please input your email!' },
                                    { type: 'email', message: 'Please enter a valid email!' }
                                ]}
                            >
                                <Input prefix={<MailOutlined />} />
                            </Form.Item>

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={profileLoading}
                                    icon={<SaveOutlined />}
                                >
                                    Update Profile
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>

                <Col span={24}>
                    <Card
                        title={<span><LockOutlined /> Change Password</span>}
                        bordered={false}
                        className="shadow-sm"
                    >
                        <Form
                            form={passwordForm}
                            layout="vertical"
                            onFinish={onChangePassword}
                        >
                            <Form.Item
                                label="Current Password"
                                name="current_password"
                                rules={[{ required: true, message: 'Please input your current password!' }]}
                            >
                                <Input.Password prefix={<LockOutlined />} />
                            </Form.Item>

                            <Form.Item
                                label="New Password"
                                name="new_password"
                                rules={[
                                    { required: true, message: 'Please input your new password!' },
                                    { min: 8, message: 'Password must be at least 8 characters!' }
                                ]}
                            >
                                <Input.Password prefix={<LockOutlined />} />
                            </Form.Item>

                            <Form.Item
                                label="Confirm New Password"
                                name="new_password_confirmation"
                                dependencies={['new_password']}
                                rules={[
                                    { required: true, message: 'Please confirm your new password!' },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('new_password') === value) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(new Error('The two passwords do not match!'));
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password prefix={<LockOutlined />} />
                            </Form.Item>

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={passwordLoading}
                                    danger
                                >
                                    Change Password
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ProfilePage;
