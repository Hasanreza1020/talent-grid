"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowUpDown, Check, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  bulkAssignCategory,
  bulkSetStatus,
  updateInlineField,
} from "@/app/admin/actions";
import { formatCompact, formatDate, NO_DATA } from "@/lib/format";
import {
  CREATOR_STATUSES,
  DATA_CONFIDENCES,
  DATA_CONFIDENCE_LABEL,
  STATUS_LABEL,
  TIER_LABEL,
  type CreatorStatus,
  type DataConfidence,
  type Tier,
} from "@/lib/types";

export type GridRow = {
  id: string;
  slug: string;
  displayName: string;
  handle: string | null;
  city: string | null;
  category: string | null;
  tier: Tier | null;
  followers: number | null;
  accountCount: number;
  status: CreatorStatus;
  dataConfidence: DataConfidence;
  hasPortrait: boolean;
  lastCaptured: string | null;
  updatedAt: string;
  archived: boolean;
};

export function CreatorGrid({
  rows,
  categories,
}: {
  rows: GridRow[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sorting, setSorting] = useState<SortingState>([{ id: "displayName", desc: false }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    city: false,
    lastCaptured: false,
  });

  const columns = useMemo<ColumnDef<GridRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(value) => table.toggleAllRowsSelected(Boolean(value))}
            aria-label="Select all creators"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label={`Select ${row.original.displayName}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "displayName",
        header: "Name",
        cell: ({ row }) => (
          <InlineText
            value={row.original.displayName}
            onSave={(value) =>
              startTransition(async () => {
                const result = await updateInlineField(row.original.id, "display_name", value);
                if (result.error) toast.error(result.error);
                else router.refresh();
              })
            }
            render={(value) => (
              <Link href={`/creators/${row.original.slug}`} className="hover:underline">
                {value}
              </Link>
            )}
          />
        ),
      },
      {
        accessorKey: "handle",
        header: "Handle",
        cell: ({ getValue }) => {
          const handle = getValue<string | null>();
          return handle ? `@${handle}` : <Muted>Not on file</Muted>;
        },
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ getValue }) => getValue<string | null>() ?? <Muted>{NO_DATA}</Muted>,
      },
      {
        accessorKey: "city",
        header: "City",
        cell: ({ row }) => (
          <InlineText
            value={row.original.city ?? ""}
            placeholder="Add a city"
            onSave={(value) =>
              startTransition(async () => {
                const result = await updateInlineField(
                  row.original.id,
                  "city",
                  value || null,
                );
                if (result.error) toast.error(result.error);
                else router.refresh();
              })
            }
            render={(value) => (value ? <>{value}</> : <Muted>{NO_DATA}</Muted>)}
          />
        ),
      },
      {
        accessorKey: "tier",
        header: "Tier",
        cell: ({ getValue }) => {
          const tier = getValue<Tier | null>();
          return tier ? TIER_LABEL[tier] : <Muted>{NO_DATA}</Muted>;
        },
      },
      {
        accessorKey: "followers",
        header: "Followers",
        cell: ({ getValue }) => {
          const value = getValue<number | null>();
          return (
            <span className={value === null ? "text-ink-muted" : "numeral"}>
              {formatCompact(value)}
            </span>
          );
        },
      },
      {
        accessorKey: "accountCount",
        header: "Accounts",
        cell: ({ getValue }) => <span className="numeral">{getValue<number>()}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Select
            value={row.original.status}
            onValueChange={(value) =>
              startTransition(async () => {
                const result = await updateInlineField(row.original.id, "status", value);
                if (result.error) toast.error(result.error);
                else router.refresh();
              })
            }
          >
            <SelectTrigger className="h-8 w-[8.5rem] border-transparent bg-transparent hover:border-hairline">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CREATOR_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: "dataConfidence",
        header: "Confidence",
        cell: ({ row }) => (
          <Select
            value={row.original.dataConfidence}
            onValueChange={(value) =>
              startTransition(async () => {
                const result = await updateInlineField(
                  row.original.id,
                  "data_confidence",
                  value,
                );
                if (result.error) toast.error(result.error);
                else router.refresh();
              })
            }
          >
            <SelectTrigger className="h-8 w-[9.5rem] border-transparent bg-transparent hover:border-hairline">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATA_CONFIDENCES.map((confidence) => (
                <SelectItem key={confidence} value={confidence}>
                  {DATA_CONFIDENCE_LABEL[confidence]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: "hasPortrait",
        header: "Portrait",
        cell: ({ getValue }) =>
          getValue<boolean>() ? (
            <Check className="size-4" aria-label="Has a portrait" />
          ) : (
            <Muted>None</Muted>
          ),
      },
      {
        accessorKey: "lastCaptured",
        header: "Last read",
        cell: ({ getValue }) => {
          const value = getValue<string | null>();
          return value ? formatDate(value) : <Muted>{NO_DATA}</Muted>;
        },
      },
      {
        id: "edit",
        header: "",
        cell: ({ row }) => (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/creators/${row.original.id}/edit`}>Edit</Link>
          </Button>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [router],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, rowSelection, columnVisibility },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Filter this table"
          className="max-w-[18rem] bg-surface"
          aria-label="Filter creators"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="mr-2 size-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                  className="capitalize"
                >
                  {typeof column.columnDef.header === "string"
                    ? column.columnDef.header
                    : column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-sm text-ink-muted">
          {table.getFilteredRowModel().rows.length} of {rows.length}
        </span>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border border-hairline bg-brand-quiet px-4 py-3">
          <span className="text-sm">
            {selectedIds.length} selected
          </span>

          <Select
            onValueChange={(value) =>
              startTransition(async () => {
                const result = await bulkSetStatus({ creatorIds: selectedIds, status: value });
                if (result.error) toast.error(result.error);
                else {
                  toast.success(`Status set for ${selectedIds.length} creators.`);
                  setRowSelection({});
                  router.refresh();
                }
              })
            }
          >
            <SelectTrigger className="h-8 w-[11rem] bg-surface">
              <SelectValue placeholder="Set status" />
            </SelectTrigger>
            <SelectContent>
              {CREATOR_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) =>
              startTransition(async () => {
                const result = await bulkAssignCategory({
                  creatorIds: selectedIds,
                  categoryId: value,
                });
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Category added as a secondary category.");
                  setRowSelection({});
                  router.refresh();
                }
              })
            }
          >
            <SelectTrigger className="h-8 w-[14rem] bg-surface">
              <SelectValue placeholder="Add a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
            <X className="mr-1 size-3" />
            Clear selection
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[68rem] border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-hairline text-left">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="py-2 pr-3 text-xs font-normal text-ink-muted"
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 hover:text-ink"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="size-3" />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={
                  row.original.archived
                    ? "border-b border-hairline text-ink-muted"
                    : "border-b border-hairline"
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="py-1.5 pr-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pending ? <p className="text-xs text-ink-muted">Saving</p> : null}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-ink-muted">{children}</span>;
}

/** Click to edit, Enter to save, Escape to abandon. */
function InlineText({
  value,
  onSave,
  render,
  placeholder,
}: {
  value: string;
  onSave: (value: string) => void;
  render: (value: string) => React.ReactNode;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <span className="group/inline flex items-center gap-2">
        {render(value)}
        <button
          type="button"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          aria-label="Edit"
          className="text-xs text-ink-muted opacity-0 transition-opacity group-hover/inline:opacity-100 focus-visible:opacity-100"
        >
          Edit
        </button>
      </span>
    );
  }

  return (
    <Input
      autoFocus
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft !== value) onSave(draft.trim());
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          setEditing(false);
          if (draft !== value) onSave(draft.trim());
        }
        if (event.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className="h-8 w-full"
    />
  );
}
