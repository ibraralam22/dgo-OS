'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@services/settings-api';
import { useAuthStore } from '@store/auth-store';
import { toast } from '@utils/toast';
import { cn } from '@utils/cn';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import {
  Settings,
  User,
  Building,
  Key,
  Loader2,
  Lock,
  Globe,
  DollarSign,
  Phone,
  MapPin,
  Mail,
  ShieldCheck,
} from 'lucide-react';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Kolkata',
];

const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'SGD',
  'INR',
  'AUD',
  'CAD',
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'profile' | 'organization'>('profile');

  // Profile Form States
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileTimezone, setProfileTimezone] = useState('UTC');

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Org Form States
  const [orgName, setOrgName] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgCurrency, setOrgCurrency] = useState('USD');
  const [orgTimezone, setOrgTimezone] = useState('UTC');

  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'TenantAdmin';

  // Queries
  const { isLoading: isProfileLoading } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: async () => {
      const res = await settingsApi.getProfile();
      setProfileFirstName(res.firstName);
      setProfileLastName(res.lastName);
      setProfilePhone(res.phone || '');
      setProfileTimezone(res.timezone);
      return res;
    },
  });

  const { data: orgData, isLoading: isOrgLoading } = useQuery({
    queryKey: ['settings-org'],
    queryFn: async () => {
      const res = await settingsApi.getOrganization();
      setOrgName(res.name);
      setOrgPhone(res.phone || '');
      setOrgAddress(res.address || '');
      setOrgCurrency(res.defaultCurrency);
      setOrgTimezone(res.timezone);
      return res;
    },
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
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFirstName.trim() || !profileLastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    updateProfileMutation.mutate({
      firstName: profileFirstName.trim(),
      lastName: profileLastName.trim(),
      phone: profilePhone.trim(),
      timezone: profileTimezone,
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Confirm password does not match new password');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      toast.error('Organization Name is required');
      return;
    }
    updateOrgMutation.mutate({
      name: orgName.trim(),
      phone: orgPhone.trim() || undefined,
      address: orgAddress.trim() || undefined,
      defaultCurrency: orgCurrency,
      timezone: orgTimezone,
    });
  };

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
        isProfileLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading profile...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Form details */}
            <div className="lg:col-span-2 glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Personal Profile Settings</h3>
              
              <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">First Name *</label>
                  <Input required value={profileFirstName} onChange={(e) => setProfileFirstName(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Last Name *</label>
                  <Input required value={profileLastName} onChange={(e) => setProfileLastName(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone</label>
                  <Input placeholder="+1 (555) 019-2834" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Timezone</label>
                  <select
                    value={profileTimezone}
                    onChange={(e) => setProfileTimezone(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 flex justify-end mt-2">
                  <Button type="submit" disabled={updateProfileMutation.isPending} size="sm" className="gap-1.5">
                    {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </div>

            {/* Change credentials */}
            <div className="glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Security credentials</h3>
              
              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Password</label>
                  <Input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">New Password (min 8 chars)</label>
                  <Input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Confirm New Password</label>
                  <Input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>

                <Button type="submit" disabled={changePasswordMutation.isPending} variant="outline" size="sm" className="w-full mt-2 gap-1.5">
                  {changePasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Change Password
                </Button>
              </form>
            </div>

          </div>
        )
      )}

      {/* Organization settings tab */}
      {activeTab === 'organization' && isAdmin && (
        isOrgLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading organization settings...</span>
          </div>
        ) : orgData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Main org Form details */}
            <div className="lg:col-span-2 glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Tenant Organization Parameters</h3>
              
              <form onSubmit={handleOrgSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Company Name *</label>
                  <Input required value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Primary Support Phone</label>
                  <Input placeholder="+1 (800) 555-0199" value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Default Currency</label>
                  <select
                    value={orgCurrency}
                    onChange={(e) => setOrgCurrency(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer"
                  >
                    {CURRENCIES.map((cur) => (
                      <option key={cur} value={cur}>{cur}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Standard Operating Timezone</label>
                  <select
                    value={orgTimezone}
                    onChange={(e) => setOrgTimezone(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-card text-xs font-semibold px-3 focus:outline-none cursor-pointer"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Headquarters Address</label>
                  <textarea
                    placeholder="Provide full headquarters physical location details..."
                    value={orgAddress}
                    onChange={(e) => setOrgAddress(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end mt-2">
                  <Button type="submit" disabled={updateOrgMutation.isPending} size="sm" className="gap-1.5">
                    {updateOrgMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building className="h-4 w-4" />}
                    Save Organization Settings
                  </Button>
                </div>
              </form>
            </div>

            {/* Readonly details */}
            <div className="glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">System Metadata</h3>
              
              <div className="flex flex-col gap-4 mt-2 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Workspace Tenant ID</span>
                  <span className="font-mono text-foreground font-semibold">{orgData.id}</span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Subdomain Address Prefix</span>
                  <span className="font-bold text-primary">{orgData.subdomain}.dgo-crm.com</span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Active Subscription Status</span>
                  <span className="font-bold text-emerald-400 capitalize">{orgData.status}</span>
                </div>
              </div>
            </div>

          </div>
        ) : null
      )}

    </div>
  );
}
