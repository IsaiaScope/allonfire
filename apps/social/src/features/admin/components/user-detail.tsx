"use client";

import type { Role } from "@allonfire/database";
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
import { Label } from "@allonfire/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@allonfire/ui/components/select";
import { ArrowLeft, Loader2, Mail, Settings, User } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { parseErrorMessage } from "@/lib/parse-error-message";
import {
  updateUserAllowedAppsAction,
  updateUserRoleAction,
} from "../actions/users";
import { AppAccessSelect } from "./app-access-select";

const INITIALS_SPLIT = /[\s@]/;

type UserDetailProps = {
  currentUserId: string;
  user: {
    createdAt: Date;
    email: string;
    id: string;
    name: string | null;
    role: Role;
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
    const nextRole = newRole as Role;
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

      <div className="max-w-3xl space-y-4">
        <Card>
          <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-sm">
                {initials}
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate text-base">
                  {user.name ?? user.email}
                </CardTitle>
                <CardDescription className="flex items-center gap-1 text-xs">
                  <Mail className="size-3 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5 px-4 pt-0 pb-3 sm:px-6 sm:pb-4">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={role === "ADMIN" ? "default" : "outline"}>
                {role}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allowedApps.map((app) => (
                <Badge key={app} variant="secondary">
                  {app}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1.5 text-muted-foreground text-xs">
              <User className="size-3" />
              Joined {user.createdAt.toLocaleDateString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
            <div className="flex items-center gap-2">
              <Settings className="size-4 text-primary" />
              <CardTitle className="text-sm">Permissions</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {isCurrentUser
                ? "You cannot change your own role."
                : "Manage this user's role and app access."}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pt-0 pb-4 sm:px-6 sm:pb-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 space-y-1.5">
                <Label className="text-muted-foreground text-xs">Role</Label>
                {mounted ? (
                  <Select
                    disabled={isCurrentUser || pending}
                    onValueChange={handleRoleChange}
                    value={role}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
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
                <Label className="text-muted-foreground text-xs">
                  App Access
                </Label>
                <AppAccessSelect
                  disabled={appsPending}
                  idPrefix="detail-app"
                  onToggle={handleAppToggle}
                  value={allowedApps}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
