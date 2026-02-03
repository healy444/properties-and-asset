import React from 'react';
import { Card, Typography, Breadcrumb } from 'antd';
import './CreditPropertiesPage.css';

const CreditPropertiesPage: React.FC = () => {
    return (
        <div>
            <Breadcrumb style={{ marginBottom: 16 }}>
                <Breadcrumb.Item>Credit</Breadcrumb.Item>
                <Breadcrumb.Item>Properties</Breadcrumb.Item>
            </Breadcrumb>
            <Card style={{ textAlign: 'center' }}>
                <Typography.Title level={4} style={{ margin: 0 }} className="credit-properties__title">
                    Coming Soon!
                </Typography.Title>
            </Card>
        </div>
    );
};

export default CreditPropertiesPage;
