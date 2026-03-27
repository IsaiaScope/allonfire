"use client";

import { useMounted } from "@allonfire/hooks/use-mounted";
import { Button } from "@allonfire/ui/components/button";
import { Checkbox } from "@allonfire/ui/components/checkbox";
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
import { ALL_APPS } from "../constants/apps";

export function AddUserForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
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
    <form action={handleSubmit} className="space-y-4" ref={formRef}>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          autoComplete="name"
          id="name"
          name="name"
          placeholder="Jane Doe"
          required
        />
      </div>
      <div className="space-y-2">
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
      <div className="space-y-2">
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
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        {mounted ? (
          <Select
            name="role"
            onValueChange={(v) => setRole(v as "ADMIN" | "USER")}
            value={role}
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USER">User</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <button
            className="flex h-9 w-fit items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-muted-foreground text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            disabled
            id="role"
            type="button"
          >
            <Loader2 className="size-3.5 animate-spin" />
            Loading...
          </button>
        )}
      </div>

      <div className="space-y-2">
        <Label>App Access</Label>
        <div className="space-y-2">
          {ALL_APPS.map((app) => (
            <label
              className="flex cursor-pointer items-center gap-3"
              htmlFor={`app-${app.id}`}
              key={app.id}
            >
              <Checkbox
                checked={allowedApps.includes(app.id)}
                id={`app-${app.id}`}
                onCheckedChange={(checked) =>
                  handleAppToggle(app.id, checked === true)
                }
              />
              <span className="text-sm">{app.label}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button disabled={pending} type="submit">
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
