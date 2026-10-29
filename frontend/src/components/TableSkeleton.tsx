import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 6, cols = 7 }) => {
  return (
    <>
      {[...Array(rows)].map((_, rIdx) => (
        <tr key={rIdx} className="animate-pulse border-b border-slate-100">
          <td className="py-4 px-6 whitespace-nowrap">
            <div className="h-4 w-16 bg-slate-200/80 rounded-md" />
          </td>
          <td className="py-4 px-6">
            <div className="space-y-1.5">
              <div className="h-4 w-44 bg-slate-200/80 rounded-md" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
          </td>
          <td className="py-4 px-6">
            <div className="h-5 w-20 bg-slate-200/70 rounded-full" />
          </td>
          <td className="py-4 px-6">
            <div className="h-5 w-16 bg-slate-200/70 rounded-full" />
          </td>
          {cols >= 5 && (
            <td className="py-4 px-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-200/80 shrink-0" />
                <div className="h-3.5 w-20 bg-slate-200/80 rounded" />
              </div>
            </td>
          )}
          {cols >= 6 && (
            <td className="py-4 px-6">
              <div className="h-3.5 w-20 bg-slate-200/80 rounded" />
            </td>
          )}
          {cols >= 7 && (
            <td className="py-4 px-6 text-right">
              <div className="h-7 w-16 bg-slate-200/70 rounded-lg ml-auto" />
            </td>
          )}
        </tr>
      ))}
    </>
  );
};
