"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createShortlist, type ActionState } from "@/app/(app)/shortlists/actions";

export function CreateShortlistDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createShortlist,
    { error: null },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New shortlist</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New shortlist</DialogTitle>
          <DialogDescription>
            Name it after the brief, so it is recognisable later.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Ramadan travel push" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clientName">Client</Label>
            <Input id="clientName" name="clientName" placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="briefNotes">Brief notes</Label>
            <Textarea id="briefNotes" name="briefNotes" rows={3} placeholder="Optional" />
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-warn">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending}>
            {pending ? "Creating" : "Create shortlist"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
