import React, { useState } from 'react';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';
import { Loader2, Lock } from 'lucide-react';
import { toast } from '@utils/toast';

interface IPasswordFormProps {
  onSave: (data: { currentPassword?: string; newPassword?: string }) => void;
  isSaving: boolean;
}

export const PasswordForm: React.FC<IPasswordFormProps> = ({ onSave, isSaving }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
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
    onSave({ currentPassword, newPassword });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="glass-card border border-border/20 bg-card/20 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
      <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Security credentials</h3>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
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

        <Button type="submit" disabled={isSaving} variant="outline" size="sm" className="w-full mt-2 gap-1.5">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          Change Password
        </Button>
      </form>
    </div>
  );
};
