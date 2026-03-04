import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/discover", label: "Discover" },
  { href: "/generate", label: "Generate" },
  { href: "/drafts", label: "Drafts" },
  { href: "/schedule", label: "Schedule" },
  { href: "/settings", label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-sidebar-border border-r bg-sidebar-background p-4">
        <div className="mb-8">
          <h2 className="font-bold text-lg">AllOnFire</h2>
          <p className="text-sidebar-foreground/60 text-xs">
            {session.user.email}
          </p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <a
              className="block rounded-md px-3 py-2 text-sidebar-foreground text-sm hover:bg-sidebar-accent"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
