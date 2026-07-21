import React, { useState } from 'react';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';

export const TIMEZONES = [
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

interface IProfileFormProps {
  initialFirstName: string;
  initialLastName: string;
  initialPhone: string;
  initialTimezone: string;
  onSave: (data: { firstName: string; lastName: string; phone: string; timezone: string }) => void;
  isSaving: boolean;
}

export const ProfileForm: React.FC<IProfileFormProps> = ({
  initialFirstName,
  initialLastName,
  initialPhone,
  initialTimezone,
  onSave,
  isSaving,
}) => {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(initialPhone);
  const [timezone, setTimezone] = useState(initialTimezone);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ firstName, lastName, phone, timezone });
  };

  return (
    <div className="lg:col-span-2 glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
      <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Personal Profile Settings</h3>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">First Name *</label>
          <Input required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Last Name *</label>
          <Input required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone</label>
          <Input placeholder="+1 (555) 019-2834" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Timezone</label>
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

        <div className="md:col-span-2 flex justify-end mt-2">
          <Button type="submit" disabled={isSaving} size="sm" className="gap-1.5">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Save Profile Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
