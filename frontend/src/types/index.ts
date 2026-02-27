export type UserRole = 'super_admin' | 'admin' | 'branch_custodian';

export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    suffix?: string;
    role: UserRole;
    is_active: boolean;
    profile_photo_url?: string;
    branch?: string;
}

export interface Division {
    id: number;
    code: string;
    name: string;
    is_active: boolean;
}

export interface Branch {
    id: number;
    division_id?: number | null;
    parent_id?: number | null;
    code: string;
    name: string;
    is_active: boolean;
    parent?: Branch;
    division?: Division;
}

export interface Category {
    id: number;
    code: string;
    name: string;
    is_active: boolean;
}

export interface AssetType {
    id: number;
    category_id: number;
    code: string;
    name: string;
    is_active: boolean;
    category?: Category;
}

export interface Brand {
    id: number;
    name: string;
    is_active: boolean;
}

export interface Supplier {
    id: number;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    is_active: boolean;
}

export interface Asset {
    id: number;
    asset_code?: string;
    division_id?: number | null;
    branch_id: number;
    category_id: number;
    asset_type_id: number;
    brand_id?: number;
    supplier_id?: number;
    model_number: string;
    serial_number?: string;
    date_of_purchase?: string | null;
    acquisition_cost: number;
    useful_life_months?: number | null;
    monthly_depreciation: number;
    accumulated_depreciation?: number | null;
    book_value?: number | null;
    condition: string;
    asset_status?: 'active' | 'inactive';
    remarks?: string;
    assigned_to?: string;
    is_draft: boolean;
    submitted_for_review_at?: string | null;
    created_by: number;
    delete_request_status: 'none' | 'pending' | 'approved' | 'rejected';
    delete_requested_by?: number | null;
    delete_requested_at?: string | null;
    delete_request_reason?: string | null;
    delete_approved_by?: number | null;
    delete_approved_at?: string | null;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;

    // Relations
    division?: Division;
    branch?: Branch;
    category?: Category;
    assetType?: AssetType;
    creator?: User;
    deleteRequester?: User;
    deleteApprover?: User;
}

export interface AuditLog {
    id: number;
    user_id: number;
    action: string;
    entity_type?: string;
    entity_id?: string;
    old_values?: any;
    new_values?: any;
    metadata?: any;
    ip_address?: string;
    user_agent?: string;
    created_at: string;

    // Relations
    user?: User;
}
