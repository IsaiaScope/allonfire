import { getSettings, prisma } from "@allonfire/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Bot, Globe, Palette } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConnectedPlatforms } from "@/features/settings/components/connected-platforms";
import { requireAuth } from "@/lib/server-auth";

export default async function GeneralSettingsPage() {
  const [settings, session] = await Promise.all([getSettings(), requireAuth()]);
  const activeProvider = settings.activeProvider;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            <CardTitle className="text-base">Platforms</CardTitle>
          </div>
          <CardDescription>
            Manage your connected social media accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectedPlatforms />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-primary" />
            <CardTitle className="text-base">AI Model</CardTitle>
          </div>
          <CardDescription>Currently active AI provider.</CardDescription>
        </CardHeader>
        <CardContent>
          {activeProvider ? (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium text-sm">{activeProvider.provider}</p>
                <p className="text-muted-foreground text-xs">
                  {activeProvider.model}
                </p>
              </div>
              {isAdmin && (
                <Link
                  className="text-primary text-xs underline underline-offset-4"
                  href="/admin/providers"
                >
                  Manage
                </Link>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No model configured.
              {isAdmin && (
                <>
                  {" "}
                  <Link
                    className="text-primary underline underline-offset-4"
                    href="/admin/providers"
                  >
                    Set one up
                  </Link>
                </>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            <CardTitle className="text-base">Appearance</CardTitle>
          </div>
          <CardDescription>Toggle between light and dark mode.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 space-y-0.5">
              <p className="font-medium text-sm">Dark mode</p>
              <p className="text-muted-foreground text-xs">
                Switch the interface between light and dark theme.
              </p>
            </div>
            <div className="shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
