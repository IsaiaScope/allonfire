import { getTopicStats } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import type { Metadata } from "next";
import { PipelineStats } from "@/features/overview/components/pipeline-stats";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const stats = await getTopicStats();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="font-bold text-2xl tracking-tight">Overview</h1>
        <Badge variant="secondary">{stats.totalCount} topics</Badge>
      </div>

      <PipelineStats stats={stats} />
    </div>
  );
}
