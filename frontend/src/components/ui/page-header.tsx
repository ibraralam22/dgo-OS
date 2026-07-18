import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <div className='flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center'>
    <div>
      <h1 className='font-headline text-2xl font-semibold tracking-tight text-zinc-900'>{title}</h1>
      <p className='mt-0.5 text-sm text-zinc-500'>{subtitle}</p>
    </div>
    {actions && <div className='flex shrink-0 items-center gap-2'>{actions}</div>}
  </div>
);
