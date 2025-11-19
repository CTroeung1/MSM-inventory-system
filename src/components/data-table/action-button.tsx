import type { Table } from "@tanstack/react-table";
import { Button } from "../ui/button";
import { ChevronDown } from "lucide-react";
import { trpc } from "@/client/trpc";
import { toast } from "sonner";
import type { HasId } from "./data-table";

interface ActionButtonProps<TData extends HasId> {
  table: Table<TData>;
  onRefetch?: () => Promise<void>;
}

export default function ActionButton<TData extends HasId>({
  table,
  onRefetch,
}: ActionButtonProps<TData>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const bulkDelMut = trpc.item.bulkDelete.useMutation({
    onError: (error) => {
      toast.error(`Failed to delete item: ${error.message}`);
    },
    onSuccess: async () => {
      toast.success("Item deleted successfully.");
      table.resetRowSelection();
      if (onRefetch) {
        await onRefetch();
      }
    },
  });

  if (selectedCount <= 0) {
    return;
  }

  const onDelete = () => {
    const itemIds = selectedRows.map((row) => row.original.id);
    bulkDelMut.mutate({ ids: itemIds });
  };

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      className="ml-auto h-8 lg:flex"
      onClick={onDelete}
    >
      <ChevronDown />
      Bulk Actions
    </Button>
  );
}
