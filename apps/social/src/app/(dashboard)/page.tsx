import { getOverviewStats, getRecentPosts } from "@allonfire/database";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Calendar, Compass, FileText, Rocket } from "lucide-react";

export default async function OverviewPage() {
  const [
    { topicCount, draftCount, scheduledCount, publishedCount },
    recentPosts,
  ] = await Promise.all([getOverviewStats(), getRecentPosts()]);

  const stats = [
    {
      label: "Discovered Topics",
      value: topicCount,
      icon: Compass,
      description: "Waiting for review",
    },
    {
      label: "Draft Posts",
      value: draftCount,
      icon: FileText,
      description: "Ready to approve",
    },
    {
      label: "Scheduled",
      value: scheduledCount,
      icon: Calendar,
      description: "Queued to publish",
    },
    {
      label: "Published",
      value: publishedCount,
      icon: Rocket,
      description: "Live on platforms",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">
          Your content pipeline at a glance.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-medium text-muted-foreground text-sm">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-3xl tabular-nums">
                {stat.value}
              </div>
              <p className="text-muted-foreground text-xs">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPosts.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground text-sm">
              No posts yet. Start by discovering topics and generating content.
            </p>
          ) : (
            <div className="space-y-3">
              {recentPosts.map((post) => (
                <div
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                  key={post.id}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex rounded bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                      {post.platform}
                    </span>
                    <span className="text-sm">
                      {post.topic?.title ?? "Untitled"}
                    </span>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                    {post.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
