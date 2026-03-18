import { SettingsSubNav } from "@/features/settings/components/settings-sub-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure integrations and automation.
        </p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <SettingsSubNav />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
