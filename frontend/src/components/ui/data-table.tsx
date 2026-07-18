'use client';

import * as React from 'react';

import { Card, CardContent } from '@components/ui/card';
import { Skeleton } from '@components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table';

import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No results found.',
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnVisibility,
    },
    manualPagination: false,
    pageCount: -1,
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: 50,
      maxSize: 500,
    },
  });

  return (
    <div className='w-full'>
      <Card className='overflow-hidden border border-zinc-200 bg-white shadow-sm'>
        <CardContent className='p-0'>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup: any) => (
                <TableRow key={headerGroup.id} className='border-b border-zinc-100 bg-zinc-50/70 hover:bg-zinc-50/70'>
                  {headerGroup.headers.map((header: any) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{ width: header.getSize() }}
                      className='h-10 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-zinc-500 first:pl-4 last:pr-4'
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                // Skeleton rows — match layout without a spinner
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className='border-b border-zinc-100'>
                    {columns.map((_, j) => (
                      <TableCell key={j} className='px-3 py-3 first:pl-4 last:pr-4'>
                        <Skeleton className='h-4 w-full rounded' style={{ opacity: 1 - i * 0.08 }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row: any) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={`border-b border-zinc-100 transition-colors hover:bg-zinc-50/60 ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell: any) => (
                      <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className='px-3 py-2.5 align-middle first:pl-4 last:pr-4'
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className='h-40 text-center'>
                    <div className='flex flex-col items-center justify-center gap-2'>
                      {/* Simple empty state icon */}
                      <div className='flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100'>
                        <svg
                          className='h-5 w-5 text-zinc-400'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                          strokeWidth={1.5}
                          aria-hidden='true'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            d='M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4'
                          />
                        </svg>
                      </div>
                      <p className='text-sm font-medium text-zinc-500'>{emptyMessage}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
