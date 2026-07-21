'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@services/settings-api';
import { useAuthStore } from '@store/auth-store';
import { toast } from '@utils/toast';
import { cn } from '@utils/cn';
import {
  User,
  Building,
  Loader2,
} from 'lucide-react';
import { ProfileForm } from '@components/settings/profile-form';
import { PasswordForm } from '@components/settings/password-form';
import { OrganizationForm } from '@components/settings/organization-form';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'profile' | 'organization'>('profile');

  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'TenantAdmin';

  // Queries
  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => settingsApi.getProfile(),
  });

  const { data: orgData, isLoading: isOrgLoading } = useQuery({
    queryKey: ['settings-org'],
    queryFn: () => settingsApi.getOrganization(),
  });

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string; phone: string; timezone: string }) =>
      settingsApi.updateProfile(data),
    onSuccess: () => {
      toast.success('Profile settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update profile'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword?: string; newPassword?: string }) =>
      settingsApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password updated successfully');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to change password'),
  });

  const updateOrgMutation = useMutation({
    mutationFn: (data: { name: string; phone?: string; address?: string; defaultCurrency?: string; timezone?: string }) =>
      settingsApi.updateOrganization(data),
    onSuccess: () => {
      toast.success('Organization settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['settings-org'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update organization details'),
  });

  return (
    <div className="flex flex-col gap-6 pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground">Global Settings</h1>
        <p className="text-xs text-muted-foreground">Manage personal profile details, timezone locales, credentials security, and company parameters.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20">
        <button
          onClick={() => setActiveTab('profile')}
          className={cn(
            'flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] cursor-pointer focus:outline-none',
            activeTab === 'profile'
              ? 'border-primary text-primary font-black'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <User className="h-4 w-4" />
          My Profile
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('organization')}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] cursor-pointer focus:outline-none',
              activeTab === 'organization'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Building className="h-4 w-4" />
            Organization Settings
          </button>
        )}
      </div>

      {/* Profile settings tab */}
      {activeTab === 'profile' && (
        isProfileLoading || !profileData ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading profile...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <ProfileForm
              initialFirstName={profileData.firstName}
              initialLastName={profileData.lastName}
              initialPhone={profileData.phone || ''}
              initialTimezone={profileData.timezone}
              onSave={(data) => updateProfileMutation.mutate(data)}
              isSaving={updateProfileMutation.isPending}
            />

            <PasswordForm
              onSave={(data) => changePasswordMutation.mutate(data)}
              isSaving={changePasswordMutation.isPending}
            />
          </div>
        )
      )}

      {/* Organization settings tab */}
      {activeTab === 'organization' && isAdmin && (
        isOrgLoading || !orgData ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading organization settings...</span>
          </div>
        ) : (
          <OrganizationForm
            orgData={orgData}
            onSave={(data) => updateOrgMutation.mutate(data)}
            isSaving={updateOrgMutation.isPending}
          />
        )
      )}
    </div>
  );
}
