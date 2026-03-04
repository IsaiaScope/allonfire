export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-bold text-2xl">Settings</h1>

      <div className="max-w-2xl space-y-8">
        <section className="space-y-4">
          <h2 className="font-semibold text-lg">n8n Integration</h2>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-muted-foreground text-sm">
              Configure your n8n webhook URLs for topic discovery and publishing
              workflows.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold text-lg">Platform Connections</h2>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-muted-foreground text-sm">
              Connect your social media accounts for automated publishing.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold text-lg">Content Generation</h2>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-muted-foreground text-sm">
              Configure Claude API key and generation preferences.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
