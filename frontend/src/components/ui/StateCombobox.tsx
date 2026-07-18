'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { INDIA_STATES } from '@utils/india-states.constants';

import { cn } from '@lib/utils';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';

interface StateComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showClear?: boolean;
  className?: string;
}

export const StateCombobox: React.FC<StateComboboxProps> = ({
  value,
  onChange,
  placeholder = 'Select state...',
  showClear = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return [...INDIA_STATES];
    const q = query.toLowerCase();
    return [...INDIA_STATES].filter((s) => s.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (state: string) => {
    onChange(state);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <button
        type='button'
        onClick={handleOpen}
        className='flex h-9 w-full items-center justify-between rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500'
      >
        <span className={value ? 'truncate text-zinc-900' : 'text-zinc-400'}>{value || placeholder}</span>
        <div className='ml-2 flex shrink-0 items-center gap-1'>
          {showClear && value && (
            <X
              className='h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600'
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClear(e);
              }}
            />
          )}
          <ChevronsUpDown className='h-4 w-4 text-zinc-400' />
        </div>
      </button>

      {open && (
        <div className='absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg'>
          <div className='flex items-center border-b border-zinc-100 px-3'>
            <Search className='mr-2 h-4 w-4 shrink-0 text-zinc-400' />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search state...'
              className='h-9 w-full bg-transparent py-2 text-sm outline-none placeholder:text-zinc-400'
            />
          </div>
          <ul className='max-h-52 overflow-y-auto py-1'>
            {filtered.length === 0 ? (
              <li className='px-3 py-4 text-center text-sm text-zinc-400'>No state found.</li>
            ) : (
              filtered.map((state) => (
                <li
                  key={state}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(state);
                  }}
                  className='flex cursor-pointer items-center px-3 py-2 text-sm hover:bg-zinc-50'
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0 text-green-600',
                      value === state ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {state}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
