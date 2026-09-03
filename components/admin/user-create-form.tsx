"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUser, type UserActionState } from "@/app/admin/users/actions";
import { USER_ROLES, USER_ROLE_LABEL } from "@/lib/types";

const ROLE_NOTE: Record<string, string> = {
  viewer: "Reads creators, accounts and metrics. Never contacts, rates or notes.",
  editor: "Reads and changes everything except people and the audit log.",
  admin: "Everything an editor can do, plus people and historic snapshots.",
};

export function UserCreateForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [role, setRole] = useState<string>("viewer");
  const [state, formAction, pending] = useActionState<UserActionState, FormData>(
    createUser,
    { error: null },
  );

  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      router.refresh();
    }
  }, [state.ok, router]);

  if (!configured) {
    return (
      <div className="max-w-prose rounded-xl border border-hairline bg-surface p-5">
        <p className="text-sm">Adding people is not available on this deployment.</p>
        <p className="mt-2 text-sm text-ink-muted">
          Creating an account needs the Supabase service role key, which is the only
          credential allowed to mint one. Set{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            SUPABASE_SERVICE_ROLE_KEY
          </code>{" "}
          in the environment and redeploy. It is read on the server only and never
          reaches the browser.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="max-w-prose space-y-4 rounded-xl border border-hairline bg-surface p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Name</Label>
          <Input id="fullName" name="fullName" autoComplete="off" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="newEmail">Email</Label>
          <Input
            id="newEmail"
            name="email"
            type="email"
            autoComplete="off"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">Password</Label>
          <Input
            id="newPassword"
            name="password"
            type="text"
            autoComplete="off"
            minLength={12}
            required
          />
          {/* Shown rather than masked on purpose: whoever fills this in has to
              read it back to the person, and a masked field they cannot check
              produces a typo nobody discovers until sign-in fails. */}
          <p className="text-xs text-ink-muted">
            At least 12 characters. Visible so you can pass it on accurately — they
            can change it once they are in.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="newRole">Access</Label>
          <input type="hidden" name="role" value={role} />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger id="newRole" className="w-full bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USER_ROLES.map((entry) => (
                <SelectItem key={entry} value={entry}>
                  {USER_ROLE_LABEL[entry]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-ink-muted">{ROLE_NOTE[role]}</p>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-warn">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating" : "Add person"}
      </Button>
    </form>
  );
}
