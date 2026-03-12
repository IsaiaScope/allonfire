"use client";

import { Badge } from "@allonfire/ui/components/badge";
import { Button } from "@allonfire/ui/components/button";
import { Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteUserAction } from "@/app/actions/users";

const INITIALS_SPLIT = /[\s@]/;

type User = {
  createdAt: Date;
  email: string;
  id: string;
  name: string | null;
  role: "ADMIN" | "USER";
};

type UserListProps = {
  currentUserId: string;
  users: User[];
};

function UserRow({
  user,
  currentUserId,
}: {
  user: User;
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isCurrentUser = user.id === currentUserId;

  function handleDelete() {
    // biome-ignore lint/suspicious/noAlert: intentional confirmation for destructive action
    if (!window.confirm(`Delete ${user.email}? This cannot be undone.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteUserAction(user.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete user");
      }
    });
  }

  const initials = (user.name ?? user.email)
    .split(INITIALS_SPLIT)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex items-center justify-between rounded-md border px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs">
          {initials}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {user.name ?? user.email}
            </span>
            {isCurrentUser && <Badge variant="secondary">You</Badge>}
            <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
              {user.role}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">{user.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {error && <span className="text-destructive text-xs">{error}</span>}
        <Button
          disabled={isCurrentUser || pending}
          onClick={handleDelete}
          size="sm"
          variant="ghost"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function UserList({ users, currentUserId }: UserListProps) {
  if (users.length === 0) {
    return <p className="text-muted-foreground text-sm">No users found.</p>;
  }

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <UserRow currentUserId={currentUserId} key={user.id} user={user} />
      ))}
    </div>
  );
}
