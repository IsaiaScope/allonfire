"use client";

import { useMounted } from "@allonfire/hooks/use-mounted";
import { Badge } from "@allonfire/ui/components/badge";
import { Button } from "@allonfire/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Checkbox } from "@allonfire/ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@allonfire/ui/components/select";
import {
  AppWindow,
  ArrowLeft,
  Loader2,
  Mail,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { parseErrorMessage } from "@/lib/parse-error-message";
import {
  updateUserAllowedAppsAction,
  updateUserRoleAction,
} from "../actions/users";
import { ALL_APPS } from "../constants/apps";

const INITIALS_SPLIT = /[\s@]/;

type UserDetailProps = {
  currentUserId: string;
  user: {
    createdAt: Date;
    email: string;
    id: string;
    name: string | null;
    role: "ADMIN" | "USER";
    allowedApps: string[];
  };
};

export function UserDetail({ user, currentUserId }: UserDetailProps) {
  const [role, setRole] = useState(user.role);
  const [pending, startTransition] = useTransition();
  const [allowedApps, setAllowedApps] = useState<string[]>(user.allowedApps);
  const [appsPending, startAppsTransition] = useTransition();
  const mounted = useMounted();

  const isCurrentUser = user.id === currentUserId;

  function handleRoleChange(newRole: string) {
    const nextRole = newRole as "ADMIN" | "USER";
    const previousRole = role;
    setRole(nextRole);

    startTransition(async () => {
      const result = await updateUserRoleAction(user.id, nextRole);
      if (result.success) {
        toast.success("Role updated.");
      } else {
        setRole(previousRole);
        toast.error("Failed to update role", {
          description: parseErrorMessage(
            result.error ?? "An unexpected error occurred."
          ),
        });
      }
    });
  }

  function handleAppToggle(appId: string, checked: boolean) {
    const previous = allowedApps;
    const next = checked
      ? [...allowedApps, appId]
      : allowedApps.filter((a) => a !== appId);

    if (next.length === 0) {
      toast.error("At least one app must be selected");
      return;
    }

    setAllowedApps(next);

    startAppsTransition(async () => {
      const result = await updateUserAllowedAppsAction(user.id, next);
      if (result.success) {
        toast.success("App access updated.");
      } else {
        setAllowedApps(previous);
        toast.error("Failed to update app access", {
          description: parseErrorMessage(
            result.error ?? "An unexpected error occurred."
          ),
        });
      }
    });
  }

  const initials = (user.name ?? user.email)
    .split(INITIALS_SPLIT)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link href="/admin/users">
            <ArrowLeft className="size-3.5" />
            Back
          </Link>
        </Button>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted font-semibold text-lg text-muted-foreground">
                {initials}
              </div>
              <div>
                <CardTitle className="text-lg">
                  {user.name ?? user.email}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Mail className="size-3" />
                  {user.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <User className="size-3.5" />
                Joined {user.createdAt.toLocaleDateString()}
              </div>
              <Badge variant={role === "ADMIN" ? "default" : "outline"}>
                {role}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <CardTitle className="text-base">Role Management</CardTitle>
            </div>
            <CardDescription>
              {isCurrentUser
                ? "You cannot change your own role."
                : "Change this user's role to control their access level."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mounted ? (
              <Select
                disabled={isCurrentUser || pending}
                onValueChange={handleRoleChange}
                value={role}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-9 w-48 items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-muted-foreground text-sm shadow-xs dark:bg-input/30">
                <Loader2 className="size-3.5 animate-spin" />
                Loading...
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AppWindow className="size-4 text-primary" />
              <CardTitle className="text-base">App Access</CardTitle>
            </div>
            <CardDescription>
              Control which applications this user can access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ALL_APPS.map((app) => (
              <label
                className="flex cursor-pointer items-center gap-3"
                htmlFor={`app-${app.id}`}
                key={app.id}
              >
                <Checkbox
                  checked={allowedApps.includes(app.id)}
                  disabled={appsPending}
                  id={`app-${app.id}`}
                  onCheckedChange={(checked) =>
                    handleAppToggle(app.id, checked === true)
                  }
                />
                <span className="text-sm">{app.label}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
