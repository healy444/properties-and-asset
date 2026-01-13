import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import type { Branch, Category, AssetType } from '../types';

export const useReferences = () => {
    const branches = useQuery<Branch[]>({
        queryKey: ['branches'],
        queryFn: () => api.get('/references/branches').then(res => res.data),
    });

    const categories = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: () => api.get('/references/categories').then(res => res.data),
    });

    const assetTypes = useQuery<AssetType[]>({
        queryKey: ['asset-types'],
        queryFn: () => api.get('/references/asset-types').then(res => res.data),
    });

    const brands = useQuery<any[]>({
        queryKey: ['brands'],
        queryFn: () => api.get('/references/brands').then(res => res.data),
    });

    const suppliers = useQuery<any[]>({
        queryKey: ['suppliers'],
        queryFn: () => api.get('/references/suppliers').then(res => res.data),
    });

    return { branches, categories, assetTypes, brands, suppliers };
};
