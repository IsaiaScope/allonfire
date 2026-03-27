import { checkAppAccess } from "@allonfire/auth/guard";
import { getSelectedTopicsPaginated } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { GenerateClient } from "@/features/generation/components/generate-client";
import { ViewerBanner } from "@/features/sidebar-layout/components/viewer-banner";
import { auth } from "@/lib/auth";

export default async function GeneratePage() {
  const { user } = await checkAppAccess(auth, "social");
  const initialData = await getSelectedTopicsPaginated();
  const totalCount = initialData.totalCount ?? 0;

  const totalPrompts = initialData.topics.reduce(
    (sum, t) => sum + t.prompts.length,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-2xl tracking-tight">Generate</h1>
          {totalCount > 0 && (
            <Badge variant="secondary">{totalCount} selected</Badge>
          )}
          {totalPrompts > 0 && (
            <Badge className="bg-primary text-primary-foreground">
              {totalPrompts === 1 ? "1 prompt" : `${totalPrompts} prompts`}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          Selected topics queued for prompt generation.
        </p>
      </div>

      {user.role === "VIEWER" && <ViewerBanner />}

      {totalCount === 0 ? (
        <EmptyState
          description="Select topics from the Discover page to queue them for prompt generation."
          icon={Sparkles}
          title="No topics selected"
        />
      ) : (
        <GenerateClient initialData={initialData} role={user.role} />
      )}
    </div>
  );
}
