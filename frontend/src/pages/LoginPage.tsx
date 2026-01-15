import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import brandLogoLight from '../assets/brand-logo.png';
import './LoginPage.css';

const LoginPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [activeSlide, setActiveSlide] = useState(0);
    const { login, isAuthenticated } = useAuth();
    const { setMode } = useThemeMode();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const carouselImages = [
        '/carousel/desktop/1.png',
        '/carousel/desktop/2.png',
        '/carousel/desktop/3.png',
    ];
    const mobileCarouselImages = [
        '/carousel/mobile/4.png',
        '/carousel/mobile/5.png',
        '/carousel/mobile/6.png',
    ];
    const carouselCopy = [
        {
            title: 'Trusted Asset Oversight',
            description: 'Track cooperative properties, equipment, and usage with confidence.',
        },
        {
            title: 'Transparent Property Records',
            description: 'Maintain clean histories for units, leases, and maintenance updates.',
        },
        {
            title: 'Accountable Member Reporting',
            description: 'Report assets, assignments, and approvals in one unified system.',
        },
    ];

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % carouselImages.length);
        }, 4500);

        return () => window.clearInterval(intervalId);
    }, [carouselImages.length]);

    useEffect(() => {
        // Force light theme on login page
        setMode('light');
        document.body.classList.add('login-body');
        return () => {
            document.body.classList.remove('login-body');
        };
    }, [setMode]);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            await login({
                login: values.username,
                password: values.password,
            });
            message.success('Welcome back!');
            navigate('/dashboard');
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Invalid username or password';
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-left">
                    <img
                        src={mobileCarouselImages[activeSlide]}
                        alt="Carousel slide"
                        className="login-slide login-slide-mobile"
                    />
                    <img
                        src={carouselImages[activeSlide]}
                        alt="Carousel slide"
                        className="login-slide login-slide-desktop"
                    />
                    <div className="login-left-overlay" />
                    <div className="login-left-caption">
                        <h2>{carouselCopy[activeSlide]?.title}</h2>
                        <p>{carouselCopy[activeSlide]?.description}</p>
                    </div>
                    <div className="login-dots">
                        {carouselImages.map((_, index) => (
                            <button
                                key={`slide-${index}`}
                                type="button"
                                aria-label={`Go to slide ${index + 1}`}
                                className={activeSlide === index ? 'active' : ''}
                                onClick={() => setActiveSlide(index)}
                            />
                        ))}
                    </div>
                </div>

                <div className="login-right">
                    <div className="login-header">
                        <img src={brandLogoLight} alt="Organization logo" style={{ width: 140, height: 'auto' }} />
                        <Typography.Text className="login-kicker">
                            Properties and assets management system
                        </Typography.Text>
                        <Typography.Text type="secondary">Please login to your account</Typography.Text>
                    </div>
                    <Form name="login" onFinish={onFinish} size="large" layout="vertical" className="login-form">
                        <Form.Item
                            label="Username"
                            name="username"
                            style={{ marginBottom: 12 }}
                            rules={[{ required: true, message: 'Please input your Username!' }]}
                        >
                            <Input prefix={<UserOutlined />} placeholder="Username" />
                        </Form.Item>
                        <Form.Item
                            label="Password"
                            name="password"
                            style={{ marginBottom: 12 }}
                            rules={[{ required: true, message: 'Please input your Password!' }]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Enter your password" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading} block className="login-button">
                                Log in
                            </Button>
                        </Form.Item>
                        <Typography.Text type="secondary" className="login-footer">
                            Secure access to Properties and Assets Management System
                        </Typography.Text>
                    </Form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
