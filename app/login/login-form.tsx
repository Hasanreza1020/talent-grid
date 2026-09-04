"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm({
  mode,
  next,
}: {
  mode: "signin" | "signup";
  next?: string;
}) {
  const action = mode === "signup" ? signUp : signIn;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {
    error: null,
  });

  return (
    <form action={formAction} className="mt-8 space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {mode === "signup" ? (
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" autoComplete="name" required />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={8}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-warn">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Working" : mode === "signup" ? "Create account" : "Sign in"}
      </Button>

      <p className="pt-2 text-sm text-ink-muted">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-ink underline underline-offset-4">
              Sign in
            </Link>
          </>
        ) : (
          <>
            No account yet?{" "}
            <Link href="/login?mode=signup" className="text-ink underline underline-offset-4">
              Create one
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
