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
          Manage platforms and preferences.
        </p>
      </div>

      {children}
    </div>
  );
}
