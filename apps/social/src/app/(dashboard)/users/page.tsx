import { getUsers, prisma } from "@allonfire/database";
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
import { redirect } from "next/navigation";
import { AddUserForm } from "@/components/add-user-form";
import { UserList } from "@/components/user-list";
import { auth } from "@/lib/auth";

export default async function UsersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (currentUser.role !== "ADMIN") {
    redirect("/");
  }

  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          Manage who has access to the dashboard.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-primary" />
              <CardTitle className="text-base">Add User</CardTitle>
            </div>
            <CardDescription>
              Create a new account. New users get the User role by default.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          <CardContent>
            <UserList currentUserId={session.user.id} users={users} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
