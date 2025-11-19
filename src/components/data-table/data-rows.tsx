import { type Table, flexRender } from "@tanstack/react-table";
import { TableCell, TableRow } from "@/components/ui/table";

interface DataRowsProps<TData> {
  table: Table<TData>;
  columns: any[];
}

export function DataRows<TData>({ table }: DataRowsProps<TData>) {
  const rows = table.getRowModel().rows;

  return (
    <>
      {rows.length ? (
        rows.map((row) => (
          <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell
            colSpan={table.getAllColumns().length}
            className="text-center"
          >
            No results.
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
