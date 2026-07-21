import React, { useState } from 'react';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';
import { Loader2, Building } from 'lucide-react';
import { TIMEZONES } from './profile-form';

export const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'SGD',
  'INR',
  'AUD',
  'CAD',
];

import { OrganizationSettings } from '@services/settings-api';

interface IOrganizationFormProps {
  orgData: OrganizationSettings;
  onSave: (data: { name: string; phone?: string; address?: string; defaultCurrency?: string; timezone?: string }) => void;
  isSaving: boolean;
}

export const OrganizationForm: React.FC<IOrganizationFormProps> = ({
  orgData,
  onSave,
  isSaving,
}) => {
  const [name, setName] = useState(orgData.name);
  const [phone, setPhone] = useState(orgData.phone || '');
  const [address, setAddress] = useState(orgData.address || '');
  const [currency, setCurrency] = useState(orgData.defaultCurrency);
  const [timezone, setTimezone] = useState(orgData.timezone);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, phone, address, defaultCurrency: currency, timezone });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Main org Form details */}
      <div className="lg:col-span-2 glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
        <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Tenant Organization Parameters</h3>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Company Name *</label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Primary Support Phone</label>
            <Input placeholder="+1 (800) 555-0199" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Default Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
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
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
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
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
            />
          </div>

          <div className="md:col-span-2 flex justify-end mt-2">
            <Button type="submit" disabled={isSaving} size="sm" className="gap-1.5">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building className="h-4 w-4" />}
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
  );
};
