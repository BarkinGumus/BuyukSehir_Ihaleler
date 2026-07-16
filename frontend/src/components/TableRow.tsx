import { flexRender, type Row } from "@tanstack/react-table";
import type { Tender } from "@/lib/types";

interface TableRowProps {
  row: Row<Tender>;
  gridColsClassName: string;
}

export function TableRow({ row, gridColsClassName }: TableRowProps) {
  return (
    <div
      className={`group grid ${gridColsClassName} h-row-height cursor-pointer items-center border-b border-outline-variant px-4 transition-colors hover:bg-surface-variant/50`}
    >
      {row.getVisibleCells().map((cell) => (
        <div key={cell.id} className="min-w-0">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </div>
      ))}
    </div>
  );
}
