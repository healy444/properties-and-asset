<?php

namespace App\Policies;

use App\Models\Asset;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class AssetPolicy
{
    private function isSameBranch(User $user, Asset $asset): bool
    {
        if (!$user->isBranchCustodian()) {
            return true;
        }

        $branchId = $user->getBranchId();
        if (!$branchId) {
            return false;
        }

        if ((int) $asset->branch_id !== (int) $branchId) {
            return false;
        }

        $divisionId = $user->getDivisionId();
        if (!$divisionId) {
            return true;
        }

        return (int) $asset->division_id === (int) $divisionId;
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isBranchCustodian();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Asset $asset): bool
    {
        return $user->isAdmin() || ($user->isBranchCustodian() && $this->isSameBranch($user, $asset));
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isBranchCustodian();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Asset $asset): bool
    {
        return $user->isAdmin() || ($user->isBranchCustodian() && $this->isSameBranch($user, $asset));
    }

    /**
     * Determine whether the user can delete the model (Permanent/Soft).
     */
    public function delete(User $user, Asset $asset): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Asset $asset): bool
    {
        return $user->isSuperAdmin();
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Asset $asset): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can request deletion.
     */
    public function requestDelete(User $user, Asset $asset): bool
    {
        // Only branch custodians request deletions. Admins/super admins perform direct deletes.
        return $user->isBranchCustodian() && $this->isSameBranch($user, $asset);
    }

    /**
     * Determine whether the user can approve deletion.
     */
    public function approveDelete(User $user, Asset $asset): bool
    {
        return $user->isAdmin();
    }
    /**
     * Determine whether the user can reject deletion.
     */
    public function rejectDelete(User $user, Asset $asset): bool
    {
        return $user->isAdmin();
    }
}
