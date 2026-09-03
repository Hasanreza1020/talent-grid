"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setUserRole } from "@/app/admin/actions";
import { revokeUser } from "@/app/admin/users/actions";
import { USER_ROLES, USER_ROLE_LABEL, type AppUser } from "@/lib/types";

export function UserTable({
  users,
  currentUserId,
  canRevoke,
}: {
  users: AppUser[];
  currentUserId: string;
  /** False without a service key: the account itself cannot be deleted. */
  canRevoke: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <table className="w-full max-w-2xl border-collapse text-sm">
      <thead>
        <tr className="border-b border-hairline text-left text-xs text-ink-muted">
          <th scope="col" className="py-2 pr-4 font-normal">Name</th>
          <th scope="col" className="py-2 font-normal">Role</th>
          <th scope="col" className="py-2 text-right font-normal">
            <span className="sr-only">Remove</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} className="border-b border-hairline">
            <td className="py-2.5 pr-4">
              {user.fullName ?? <span className="text-ink-muted">No name recorded</span>}
              {user.id === currentUserId ? (
                <span className="ml-2 text-xs text-ink-muted">you</span>
              ) : null}
            </td>
            <td className="py-2.5">
              <Select
                value={user.role}
                disabled={pending}
                onValueChange={(value) =>
                  startTransition(async () => {
                    const result = await setUserRole({ userId: user.id, role: value });
                    if (result.error) toast.error(result.error);
                    else {
                      toast.success(`${user.fullName ?? "User"} is now a ${value}.`);
                      router.refresh();
                    }
                  })
                }
              >
                <SelectTrigger className="h-8 w-[9rem] bg-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {USER_ROLE_LABEL[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </td>
            <td className="py-2.5 text-right">
              {canRevoke && user.id !== currentUserId ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    // One confirmation, because this deletes the account
                    // itself and not only the role.
                    const name = user.fullName ?? "this person";
                    if (!window.confirm(`Remove all access for ${name}? The account is deleted.`)) {
                      return;
                    }
                    startTransition(async () => {
                      const result = await revokeUser(user.id);
                      if (result.error) toast.error(result.error);
                      else {
                        toast.success(result.ok ?? "Access removed.");
                        router.refresh();
                      }
                    });
                  }}
                  className="text-sm text-ink-muted underline-offset-4 hover:text-warn hover:underline"
                >
                  Remove
                </button>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
