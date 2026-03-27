import { getUsers } from "@allonfire/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Separator } from "@allonfire/ui/components/separator";
import { Shield, UserPlus } from "lucide-react";
import { headers } from "next/headers";
import { AddUserForm } from "@/features/admin/components/add-user-form";
import { UserList } from "@/features/admin/components/user-list";
import { auth } from "@/lib/auth";

export default async function AdminUsersPage() {
  const [session, users] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getUsers(),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            <CardTitle className="text-base">Add User</CardTitle>
          </div>
          <CardDescription>
            Create a new account and assign a role.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <AddUserForm />
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <CardTitle className="text-base">Team Members</CardTitle>
          </div>
          <CardDescription>
            {users.length} user{users.length !== 1 ? "s" : ""} with dashboard
            access.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <UserList currentUserId={session?.user.id ?? ""} users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
