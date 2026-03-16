import { getDrafts } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import { Button } from "@allonfire/ui/components/button";
import { Card, CardContent, CardHeader } from "@allonfire/ui/components/card";
import { FileText, Pencil } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import {
  ApprovePostButton,
  RejectPostButton,
  SchedulePostButton,
} from "@/features/posts/components/post-actions";

const platformIcon: Record<string, string> = {
  LINKEDIN: "in",
  TWITTER: "\u{1D54F}",
  YOUTUBE: "\u25B6",
  TIKTOK: "\u266A",
};

export default async function DraftsPage() {
  const drafts = await getDrafts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Drafts</h1>
          <p className="text-muted-foreground text-sm">
            Review and approve generated content.
          </p>
        </div>
        {drafts.length > 0 && (
          <Badge variant="secondary">
            {drafts.length} draft{drafts.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {drafts.length === 0 ? (
        <EmptyState
          description="Generate content from selected topics first. Drafts will appear here for review."
          icon={FileText}
          title="No drafts to review"
        />
      ) : (
        <div className="space-y-3">
          {drafts.map((post) => (
            <Card key={post.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded bg-primary/10 font-bold text-primary text-xs">
                    {platformIcon[post.platform] ?? post.platform[0]}
                  </span>
                  <Badge className="text-xs" variant="outline">
                    {post.platform}
                  </Badge>
                  <Badge className="text-xs" variant="secondary">
                    {post.type}
                  </Badge>
                  {post.topic && (
                    <span className="ml-auto text-muted-foreground text-xs">
                      {post.topic.title}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm leading-relaxed">
                  {post.content.slice(0, 400)}
                  {post.content.length > 400 ? "..." : ""}
                </p>
                <div className="flex gap-2">
                  <ApprovePostButton postId={post.id} />
                  <SchedulePostButton postId={post.id} />
                  <Button asChild size="xs" variant="outline">
                    <Link href={`/drafts/${post.id}`}>
                      <Pencil className="size-3" />
                      Edit
                    </Link>
                  </Button>
                  <RejectPostButton postId={post.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
