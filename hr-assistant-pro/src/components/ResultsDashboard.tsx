'use client';

import { useMemo } from 'react';
import { EvaluationResult } from '@/types';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';

interface ResultsDashboardProps {
  results: EvaluationResult[];
}

const columnHelper = createColumnHelper<EvaluationResult>();

const columns = [
  columnHelper.accessor('candidateName', {
    header: 'Candidate',
  }),
  columnHelper.accessor('scores.overall', {
    header: 'Overall Score',
    cell: info => `${Math.round(info.getValue() * 100)}%`,
  }),
  columnHelper.accessor('tier', {
    header: 'Tier',
    cell: info => <span className={`px-2 py-1 text-xs font-medium rounded-full ${{
      'Top Tier': 'bg-green-100 text-green-800',
      'Promising': 'bg-blue-100 text-blue-800',
      'Not a Fit': 'bg-red-100 text-red-800',
    }[info.getValue()] || 'bg-gray-100 text-gray-800'}`}>{info.getValue()}</span>,
  }),
  columnHelper.accessor('explanation', {
    header: 'Summary',
    cell: info => <p className="text-sm text-gray-600 truncate max-w-xs">{info.getValue()}</p>,
  }),
];

export default function ResultsDashboard({ results }: ResultsDashboardProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: results,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={header.column.getToggleSortingHandler()}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? null}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-200">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
