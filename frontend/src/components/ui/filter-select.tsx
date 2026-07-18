'use client';

import React from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';

interface FilterSelectProps {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({ label, value, options, onChange }) => (
  <div className='space-y-1.5'>
    <label className='text-xs font-medium uppercase tracking-wide text-zinc-500'>{label}</label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className='border-zinc-300 bg-white text-sm'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
