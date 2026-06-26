import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Table({
  columns,
  data = [],
  isLoading = false,
  pageCount: customPageCount,
  onPageIndexChange,
  onPageSizeChange,
  currentPage = 1,
  pageSize: customPageSize = 10,
  manualPagination = false,
}) {
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: customPageSize,
  });

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination: manualPagination ? { pageIndex: currentPage - 1, pageSize: customPageSize } : pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: manualPagination ? undefined : setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination,
    pageCount: manualPagination ? customPageCount : undefined,
  });

  const activePageIndex = manualPagination ? currentPage - 1 : table.getState().pagination.pageIndex;
  const activePageSize = manualPagination ? customPageSize : table.getState().pagination.pageSize;
  const activePageCount = manualPagination ? (customPageCount || 1) : table.getPageCount();

  const handlePageSizeChange = (size) => {
    if (manualPagination) {
      onPageSizeChange?.(size);
    } else {
      table.setPageSize(size);
    }
  };

  const handlePageChange = (index) => {
    if (manualPagination) {
      onPageIndexChange?.(index);
    } else {
      table.setPageIndex(index - 1);
    }
  };

  const canPrev = manualPagination ? (currentPage > 1) : table.getCanPreviousPage();
  const canNext = manualPagination ? (currentPage < activePageCount) : table.getCanNextPage();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-muted/50 border-b border-border">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors hover:text-foreground"
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span className="text-muted-foreground">
                        {{
                          asc: <ArrowUp className="w-3.5 h-3.5" />,
                          desc: <ArrowDown className="w-3.5 h-3.5" />,
                        }[header.column.getIsSorted()] ?? <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <AnimatePresence mode="wait">
            <motion.tbody 
              key={activePageIndex}
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="divide-y divide-border"
            >
              {isLoading ? (
                <motion.tr variants={itemVariants}>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <div className="flex justify-center items-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary border-slate-200 dark:border-slate-800" />
                      <span className="text-sm text-muted-foreground font-medium">Loading data...</span>
                    </div>
                  </td>
                </motion.tr>
              ) : data.length === 0 ? (
                <motion.tr variants={itemVariants}>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-muted-foreground font-medium">
                    No records found.
                  </td>
                </motion.tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <motion.tr 
                    variants={itemVariants}
                    key={row.id} 
                    className="hover:bg-muted/50 transition-colors group"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 text-sm text-foreground">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </motion.tbody>
          </AnimatePresence>
        </table>
      </div>

      {/* Pagination Controls */}
      {!isLoading && data.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3.5 bg-card border border-border rounded-xl text-sm shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>Show</span>
            <select
              value={activePageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-hidden"
            >
              {[5, 10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>entries</span>
          </div>

          <div className="flex items-center gap-5">
            <span className="text-muted-foreground">
              Page <strong className="text-foreground font-medium">{activePageIndex + 1}</strong> of <strong className="text-foreground font-medium">{activePageCount || 1}</strong>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(activePageIndex)}
                disabled={!canPrev}
                className="p-2 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(activePageIndex + 2)}
                disabled={!canNext}
                className="p-2 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
