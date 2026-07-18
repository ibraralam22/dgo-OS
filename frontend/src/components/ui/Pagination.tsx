'use client';

import { Button } from '@components/ui/button';

import { cn } from '@lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  totalItems: number;
}

export function Pagination({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }: PaginationProps) {
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = (): Array<number | '...'> => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className='flex items-center justify-between'>
      <p className='text-sm text-zinc-500'>
        Showing{' '}
        <span className='font-medium text-zinc-700'>
          {start}–{end}
        </span>{' '}
        of <span className='font-medium text-zinc-700'>{totalItems}</span>
      </p>

      <div className='flex items-center gap-1'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className='h-8 w-8 border-zinc-200 bg-white p-0 text-zinc-600 transition-transform hover:bg-zinc-50 active:scale-[0.97] disabled:opacity-40'
          aria-label='Previous page'
        >
          <ChevronLeft className='h-4 w-4' />
        </Button>

        {getPageNumbers().map((page, index) =>
          page === '...' ? (
            <span key={`ellipsis-${index}`} className='flex h-8 w-8 items-center justify-center text-sm text-zinc-400'>
              ···
            </span>
          ) : (
            <Button
              key={page}
              variant='outline'
              size='sm'
              onClick={() => onPageChange(page)}
              className={cn(
                'h-8 w-8 border-zinc-200 bg-white p-0 text-sm transition-all active:scale-[0.97]',
                currentPage === page
                  ? 'border-green-500 bg-green-500 font-semibold text-white hover:bg-green-600'
                  : 'text-zinc-600 hover:bg-zinc-50'
              )}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </Button>
          )
        )}

        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className='h-8 w-8 border-zinc-200 bg-white p-0 text-zinc-600 transition-transform hover:bg-zinc-50 active:scale-[0.97] disabled:opacity-40'
          aria-label='Next page'
        >
          <ChevronRight className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
}
