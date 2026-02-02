import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export interface DashboardStats {
    total_assets: number;
    active_assets: number;
    inactive_assets: number;
    acquisition_cost: number;
    total_depreciation: number;
    monthly_depreciation_expense: number;
    fully_depreciated_active: number;
    near_end_of_life_count: number;
    near_end_of_life_list: Array<{
        id: number;
        asset_code: string;
        model_number: string;
        date_of_purchase: string;
        useful_life_months: number;
    }>;
    by_condition: Array<{ condition: string; count: number }>;
    by_branch: Array<{ name: string; count: number }>;
    by_branch_stacked: Array<{ parent: string; branch: string; count: number }>;
    by_category: Array<{ name: string; count: number }>;
    top_suppliers: Array<{ name: string; count: number }>;
    top_assigned: Array<{ assigned_to: string; count: number }>;
}

export const useDashboardStats = () => {
    return useQuery<DashboardStats>({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const { data } = await api.get('/dashboard/stats');
            return data;
        },
    });
};
