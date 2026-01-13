import React from 'react';
import { Card, Typography, Breadcrumb } from 'antd';

const CreditPropertiesPage: React.FC = () => {
    return (
        <div>
            <Breadcrumb style={{ marginBottom: 16 }}>
                <Breadcrumb.Item>Credit</Breadcrumb.Item>
                <Breadcrumb.Item>Properties</Breadcrumb.Item>
            </Breadcrumb>
            <Card style={{ textAlign: 'center' }}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                    Coming Soon!
                </Typography.Title>
            </Card>
        </div>
    );
};

export default CreditPropertiesPage;
