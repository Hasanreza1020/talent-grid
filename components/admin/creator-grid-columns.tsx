import type { TransitionStartFunction } from "react";
import type { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Check } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateInlineField } from "@/app/admin/actions";
import { formatCompact, formatDate, NO_DATA } from "@/lib/format";
import {
  CREATOR_STATUSES,
  DATA_CONFIDENCES,
  DATA_CONFIDENCE_LABEL,
  STATUS_LABEL,
  TIER_LABEL,
  type Tier,
} from "@/lib/types";
import type { GridRow } from "./creator-grid";
import { InlineText, Muted } from "./creator-grid-cells";

type Router = ReturnType<typeof useRouter>;

/**
 * Builds the admin grid's column definitions. The inline-edit cells need to
 * fire a server action and refresh the route, so the transition starter and
 * the router come in as dependencies rather than being reached for here.
 */
export function createGridColumns({
  startTransition,
  router,
}: {
  startTransition: TransitionStartFunction;
  router: Router;
}): ColumnDef<GridRow>[] {
  return [
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
  ];
}
