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
import { setUserRole } from "@/app/(app)/admin/actions";
import { USER_ROLES, USER_ROLE_LABEL, type AppUser } from "@/lib/types";

export function UserTable({
  users,
  currentUserId,
}: {
  users: AppUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <table className="w-full max-w-2xl border-collapse text-sm">
      <thead>
        <tr className="border-b border-hairline text-left text-xs text-ink-muted">
          <th scope="col" className="py-2 pr-4 font-normal">Name</th>
          <th scope="col" className="py-2 font-normal">Role</th>
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
          </tr>
        ))}
      </tbody>
    </table>
  );
}
