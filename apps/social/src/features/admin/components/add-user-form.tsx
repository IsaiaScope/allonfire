"use client";

import type { Role } from "@allonfire/database";
import { useMounted } from "@allonfire/hooks/use-mounted";
import { Button } from "@allonfire/ui/components/button";
import { Input } from "@allonfire/ui/components/input";
import { Label } from "@allonfire/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@allonfire/ui/components/select";
import { Loader2, UserPlus } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { parseErrorMessage } from "@/lib/parse-error-message";
import { createUserAction } from "../actions/users";
import { AppAccessSelect } from "./app-access-select";

export function AddUserForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("USER");
  const [allowedApps, setAllowedApps] = useState<string[]>(["all"]);
  const mounted = useMounted();
  const formRef = useRef<HTMLFormElement>(null);

  function handleAppToggle(appId: string, checked: boolean) {
    setAllowedApps((prev) =>
      checked ? [...prev, appId] : prev.filter((a) => a !== appId)
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    const data = {
      name: (formData.get("name") as string) || "",
      email: (formData.get("email") as string) || "",
      password: (formData.get("password") as string) || "",
      role,
      allowedApps,
    };

    startTransition(async () => {
      const result = await createUserAction(data);
      if (result.success) {
        formRef.current?.reset();
        setRole("USER");
        setAllowedApps(["all"]);
      } else {
        setError(result.error ?? "Failed to create user");
        toast.error("Failed to create user", {
          description: parseErrorMessage(
            result.error ?? "An unexpected error occurred."
          ),
        });
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3" ref={formRef}>
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          autoComplete="name"
          id="name"
          name="name"
          placeholder="Jane Doe"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          autoComplete="email"
          id="email"
          name="email"
          placeholder="jane@example.com"
          required
          type="email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          autoComplete="new-password"
          id="password"
          minLength={8}
          name="password"
          placeholder="Minimum 8 characters"
          required
          type="password"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="role">Role</Label>
          {mounted ? (
            <Select
              name="role"
              onValueChange={(v) => setRole(v as Role)}
              value={role}
            >
              <SelectTrigger className="w-full" id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-muted-foreground text-sm shadow-xs dark:bg-input/30">
              <Loader2 className="size-3.5 animate-spin" />
              Loading...
            </div>
          )}
        </div>

        <div className="flex-1 space-y-1.5">
          <Label>App Access</Label>
          <AppAccessSelect
            idPrefix="add-app"
            onToggle={handleAppToggle}
            value={allowedApps}
          />
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button className="mt-1" disabled={pending} type="submit">
        {pending ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <UserPlus className="size-3.5" />
            Add User
          </>
        )}
      </Button>
    </form>
  );
}
