import { getProviders, getSettings } from "@allonfire/database";
import { ProvidersHub } from "@/features/providers/components/providers-hub";

export default async function ProvidersPage() {
  const [providers, settings] = await Promise.all([
    getProviders(),
    getSettings(),
  ]);

  const activeProviderId = settings.activeProviderId;
  const activeProvider = settings.activeProvider;

  return (
    <ProvidersHub
      activeProvider={
        activeProvider
          ? { name: activeProvider.provider, model: activeProvider.model }
          : null
      }
      activeProviderId={activeProviderId}
      providers={providers.map((p) => ({
        id: p.id,
        provider: p.provider,
        maskedKey: p.apiKey,
        model: p.model,
        isVerified: p.isVerified,
      }))}
    />
  );
}
