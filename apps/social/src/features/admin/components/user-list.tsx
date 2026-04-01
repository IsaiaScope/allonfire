"use client";

import type { Role } from "@allonfire/database";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@allonfire/ui/components/alert-dialog";
import { Avatar, AvatarFallback } from "@allonfire/ui/components/avatar";
import { Badge } from "@allonfire/ui/components/badge";
import { Button } from "@allonfire/ui/components/button";
import { Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { parseErrorMessage } from "@/lib/parse-error-message";
import { deleteUserAction } from "../actions/users";

const INITIALS_SPLIT = /[\s@]/;

type User = {
  createdAt: Date;
  email: string;
  id: string;
  name: string | null;
  role: Role;
  allowedApps: string[];
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isCurrentUser = user.id === currentUserId;

  function handleConfirmDelete() {
    startTransition(async () => {
      const result = await deleteUserAction(user.id);
      if (!result.success) {
        toast.error("Failed to delete user", {
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
    <div className="flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-muted/50">
      <Link
        className="flex min-w-0 flex-1 items-center gap-2.5"
        href={`/admin/users/${user.id}`}
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium text-sm">
              {user.name ?? user.email}
            </span>
            {isCurrentUser && (
              <Badge
                className="shrink-0 px-1.5 py-0 text-[10px]"
                variant="secondary"
              >
                You
              </Badge>
            )}
            <Badge
              className="shrink-0 px-1.5 py-0 text-[10px]"
              variant={user.role === "ADMIN" ? "default" : "outline"}
            >
              {user.role}
            </Badge>
          </div>
          <p className="truncate text-muted-foreground text-xs">{user.email}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {user.allowedApps.map((app) => (
              <Badge
                className="px-1.5 py-0 text-[10px]"
                key={app}
                variant="secondary"
              >
                {app}
              </Badge>
            ))}
          </div>
        </div>
      </Link>

      <div className="flex shrink-0 items-center">
        <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
          <Button
            className="cursor-pointer disabled:pointer-events-auto disabled:cursor-not-allowed"
            disabled={isCurrentUser || pending}
            onClick={() => setConfirmOpen(true)}
            size="sm"
            variant="ghost"
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete user?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete{" "}
                <span className="font-medium text-foreground">
                  {user.email}
                </span>
                . This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
