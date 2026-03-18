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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@allonfire/ui/components/select";
import { ArrowLeft, Loader2, Mail, Shield, User } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { updateUserRoleAction } from "../actions/users";

const INITIALS_SPLIT = /[\s@]/;

type UserDetailProps = {
  currentUserId: string;
  user: {
    createdAt: Date;
    email: string;
    id: string;
    name: string | null;
    role: "ADMIN" | "USER";
  };
};

export function UserDetail({ user, currentUserId }: UserDetailProps) {
  const [role, setRole] = useState(user.role);
  const [pending, startTransition] = useTransition();
  const mounted = useMounted();
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "error" | "success";
  } | null>(null);

  const isCurrentUser = user.id === currentUserId;

  function handleRoleChange(newRole: string) {
    const nextRole = newRole as "ADMIN" | "USER";
    setFeedback(null);
    const previousRole = role;
    setRole(nextRole);

    startTransition(async () => {
      const result = await updateUserRoleAction(user.id, nextRole);
      if (result.success) {
        setFeedback({ type: "success", message: "Role updated" });
      } else {
        setRole(previousRole);
        setFeedback({
          type: "error",
          message: result.error ?? "Failed to update role",
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

            {feedback && (
              <p
                className={`text-sm ${feedback.type === "error" ? "text-destructive" : "text-green-600"}`}
              >
                {feedback.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
