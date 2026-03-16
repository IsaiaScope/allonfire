import { getScheduledPosts } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Calendar } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { UnschedulePostButton } from "@/features/posts/components/post-actions";

export default async function SchedulePage() {
  const scheduled = await getScheduledPosts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Schedule</h1>
        <p className="text-muted-foreground text-sm">
          Posts queued for publishing.
        </p>
      </div>

      {scheduled.length === 0 ? (
        <EmptyState
          description="Approve drafts and set a publish time to see them here."
          icon={Calendar}
          title="Nothing scheduled"
        />
      ) : (
        <div className="space-y-3">
          {scheduled.map((post) => (
            <Card key={post.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{post.platform}</Badge>
                    {post.topic && (
                      <CardTitle className="text-sm">
                        {post.topic.title}
                      </CardTitle>
                    )}
                  </div>
                  <span className="font-mono text-muted-foreground text-sm">
                    {post.scheduledAt?.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between gap-4">
                  <p className="line-clamp-2 text-muted-foreground text-sm">
                    {post.content.slice(0, 200)}
                  </p>
                  <UnschedulePostButton postId={post.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
