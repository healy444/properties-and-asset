import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, DatePicker, Select, Button, Card, Space, Typography, message, Divider, Checkbox, Collapse, Tooltip } from 'antd';
import { SaveOutlined, SendOutlined, ArrowLeftOutlined, RightCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useReferences } from '../hooks/useReferences';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import type { Asset } from '../types';
import './AssetFormPage.css';

const { Title } = Typography;

const AssetFormPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const { branches, categories, assetTypes, brands, suppliers } = useReferences();
    const [isDraft, setIsDraft] = useState(true);
    const [submitIntent, setSubmitIntent] = useState<'draft' | 'review' | 'default'>('default');
    const selectedCategoryId = Form.useWatch('category_id', form);
    const isEdit = !!id;
    const { user: currentUser } = useAuth();
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const isBranchCustodian = currentUser?.role === 'branch_custodian';

    const { data: asset, isLoading } = useQuery<Asset>({
        queryKey: ['asset', id],
        queryFn: () => api.get(`/assets/${id}`).then(res => res.data),
        enabled: !!id,
    });

    useEffect(() => {
        if (asset) {
            form.setFieldsValue({
                ...asset,
                date_of_purchase: asset.date_of_purchase ? dayjs(asset.date_of_purchase) : null,
            });
            setIsDraft(asset.is_draft);
        }
    }, [asset, form]);

    useEffect(() => {
        if (!isBranchCustodian || !branches.data?.length) {
            return;
        }
        const branchId = branches.data.find(b => b.name === currentUser?.branch)?.id;
        if (branchId && form.getFieldValue('branch_id') !== branchId) {
            form.setFieldsValue({ branch_id: branchId });
        }
    }, [isBranchCustodian, branches.data, currentUser?.branch, form]);

    useEffect(() => {
        if (!isBranchCustodian || isEdit) {
            return;
        }
        if (!isDraft) {
            setIsDraft(true);
        }
        if (form.getFieldValue('is_draft') !== true) {
            form.setFieldsValue({ is_draft: true });
        }
    }, [isBranchCustodian, isEdit, isDraft, form]);

    const mutation = useMutation({
        mutationFn: (values: any) => {
            if (id) {
                return api.put(`/assets/${id}`, values);
            }
            return api.post('/assets', values);
        },
        onSuccess: (_data, variables) => {
            const isDraftPayload = !!variables?.is_draft;
            if (!id) {
                if (isDraftPayload && isBranchCustodian && submitIntent === 'review') {
                    message.success('Asset submitted for review.');
                } else {
                    message.success(isDraftPayload ? 'Asset saved in drafts.' : 'Asset created successfully');
                }
            } else {
                if (isDraftPayload && isBranchCustodian && submitIntent === 'review') {
                    message.success('Draft submitted for review.');
                } else {
                    message.success(isDraftPayload ? 'Draft updated.' : 'Asset updated successfully');
                }
            }
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            navigate('/assets');
            setSubmitIntent('default');
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Saving failed');
        },
    });

    const onFinish = (values: any) => {
        // Base payload
        let payload: any = {
            ...values,
            is_draft: isDraft,
        };
        if (isBranchCustodian) {
            payload.submit_for_review = submitIntent === 'review';
        }

        if (values.date_of_purchase) {
            payload.date_of_purchase = values.date_of_purchase.format('YYYY-MM-DD');
        }

        // When editing an active asset and not super admin, only allow status/assignment + branch.
        if (isActiveAsset && !isSuperAdmin) {
            payload = {
                condition: values.condition,
                asset_status: values.asset_status,
                assigned_to: values.assigned_to,
                remarks: values.remarks,
                branch_id: values.branch_id,
                is_draft: false,
            };
        }

        mutation.mutate(payload);
    };

    const isActiveAsset = !!id && !asset?.is_draft;
    const isIdentFinReadOnly = isActiveAsset && !isSuperAdmin;

    useEffect(() => {
        const selectedAssetTypeId = form.getFieldValue('asset_type_id');
        if (!selectedCategoryId || !selectedAssetTypeId) return;

        const selectedAssetType = assetTypes.data?.find(t => t.id === selectedAssetTypeId);
        if (selectedAssetType && selectedAssetType.category_id !== selectedCategoryId) {
            form.setFieldsValue({ asset_type_id: undefined });
        }
    }, [selectedCategoryId, assetTypes.data, form]);

    return (
        <Card loading={isLoading}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Tooltip title="Back to assets">
                        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/assets')} />
                    </Tooltip>
                    <Title level={2} style={{ margin: 0 }}>
                        {id ? `Edit Asset: ${asset?.asset_code || 'Draft'}` : 'New Asset'}
                    </Title>
                </div>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ is_draft: true, asset_status: 'active' }}
                    disabled={mutation.isPending}
                >
                    <div className="asset-form__grid asset-form__grid--three">
                        <Form.Item name="branch_id" label="Branch" rules={[{ required: true }]}>
                            <Select
                                disabled={isBranchCustodian}
                                options={branches.data?.map(b => ({ label: b.name, value: b.id }))}
                            />
                        </Form.Item>
                        <Form.Item name="category_id" label="Category" rules={[{ required: true }]}>
                            <Select
                                disabled={isActiveAsset && !isSuperAdmin}
                                options={categories.data?.map(c => ({ label: c.name, value: c.id }))}
                            />
                        </Form.Item>
                        <Form.Item name="asset_type_id" label="Asset Type" rules={[{ required: true }]}>
                            <Select
                                disabled={isActiveAsset && !isSuperAdmin}
                                options={assetTypes.data
                                    ?.filter(t => t.category_id === selectedCategoryId)
                                    .map(t => ({ label: t.name, value: t.id }))}
                            />
                        </Form.Item>
                    </div>

                    <Collapse
                        bordered={false}
                        style={{ background: 'transparent', paddingLeft: 0 }}
                        defaultActiveKey={isEdit ? [] : ['ident', 'fin']}
                        expandIconPosition="end"
                        expandIcon={({ isActive }) => (
                            <RightCircleOutlined
                                rotate={isActive ? 90 : 0}
                                style={{ color: '#1677ff' }}
                            />
                        )}
                    >
                        <Collapse.Panel
                            header={<div style={{ fontWeight: 600, fontSize: 16, marginLeft: -8 }}>Identification</div>}
                            key="ident"
                            style={{ padding: 0 }}
                        >
                            <div className="asset-form__grid asset-form__grid--three asset-form__grid--padded">
                                <Form.Item name="brand_id" label="Brand">
                                    <Select allowClear options={brands.data?.map(b => ({ label: b.name, value: b.id }))} disabled={isIdentFinReadOnly} />
                                </Form.Item>
                                <Form.Item name="model_number" label="Model Number">
                                    <Input disabled={isIdentFinReadOnly} />
                                </Form.Item>
                                <Form.Item name="serial_number" label="Serial Number">
                                    <Input disabled={isIdentFinReadOnly} />
                                </Form.Item>
                            </div>
                        </Collapse.Panel>

                        <Collapse.Panel
                            header={<div style={{ fontWeight: 600, fontSize: 16, marginLeft: -8 }}>Financials</div>}
                            key="fin"
                            style={{ padding: 0 }}
                        >
                            <div className="asset-form__grid asset-form__grid--three asset-form__grid--padded">
                                <Form.Item name="date_of_purchase" label="Date of Purchase">
                                    <DatePicker style={{ width: '100%' }} disabled={isIdentFinReadOnly} />
                                </Form.Item>
                                <Form.Item name="acquisition_cost" label="Acquisition Cost" rules={[{ required: true }]}>
                                    <InputNumber style={{ width: '100%' }} prefix="PHP" disabled={isIdentFinReadOnly} />
                                </Form.Item>
                                <Form.Item name="useful_life_months" label="Useful Life (Months)">
                                    <InputNumber style={{ width: '100%' }} min={1} disabled={isIdentFinReadOnly} />
                                </Form.Item>
                            </div>
                        </Collapse.Panel>
                    </Collapse>

                    <Divider orientation={'left' as any} orientationMargin="0">Current Status & Assignment</Divider>
                    <div className="asset-form__grid asset-form__grid--four">
                        <Form.Item name="condition" label="Condition" rules={[{ required: true }]}>
                            <Select options={[
                                { label: 'Good', value: 'good' },
                                { label: 'Fair', value: 'fair' },
                                { label: 'Poor', value: 'poor' },
                            ]} />
                        </Form.Item>
                        <Form.Item name="asset_status" label="Asset Status">
                            <Select options={[
                                { label: 'Active', value: 'active' },
                                { label: 'Inactive', value: 'inactive' },
                            ]} />
                        </Form.Item>
                        <Form.Item name="assigned_to" label="Assigned To">
                            <Input placeholder="Employee Name" />
                        </Form.Item>
                        <Form.Item name="supplier_id" label="Supplier" hidden={isActiveAsset}>
                            <Select allowClear options={suppliers.data?.map(s => ({ label: s.name, value: s.id }))} />
                        </Form.Item>
                    </div>

                    <Form.Item name="remarks" label="Remarks">
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    {!isActiveAsset && !isBranchCustodian && (
                        <Form.Item name="is_draft" valuePropName="checked">
                            <Checkbox onChange={(e) => setIsDraft(e.target.checked)}>
                                Save as Draft
                            </Checkbox>
                        </Form.Item>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <Button onClick={() => navigate('/assets')}>Cancel</Button>
                        {isBranchCustodian && !isActiveAsset ? (
                            <>
                                <Button
                                    icon={<SaveOutlined />}
                                    loading={mutation.isPending}
                                    onClick={() => {
                                        setIsDraft(true);
                                        setSubmitIntent('draft');
                                        form.setFieldsValue({ is_draft: true });
                                        form.submit();
                                    }}
                                >
                                    Save Draft
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    loading={mutation.isPending}
                                    onClick={() => {
                                        setIsDraft(true);
                                        setSubmitIntent('review');
                                        form.setFieldsValue({ is_draft: true });
                                        form.submit();
                                    }}
                                >
                                    Submit for Review
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={isDraft ? <SaveOutlined /> : <SendOutlined />}
                                loading={mutation.isPending}
                            >
                                {id ? (isDraft ? 'Update Draft' : 'Update Asset') : (isDraft ? 'Create Draft' : 'Create Asset')}
                            </Button>
                        )}
                    </div>
                </Form>
            </Space>
        </Card>
    );
};

export default AssetFormPage;
