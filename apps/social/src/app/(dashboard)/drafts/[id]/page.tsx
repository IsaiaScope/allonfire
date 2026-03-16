import { getPostById } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformPreview } from "@/features/posts/components/platform-preview";
import { PostEditor } from "@/features/posts/components/post-editor";

export default async function PostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPostById(id);

  if (!post) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          className="flex size-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
          href="/drafts"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Edit Post</h1>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Badge variant="outline">{post.platform}</Badge>
            <Badge variant="secondary">{post.type}</Badge>
            {post.topic && <span>{post.topic.title}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <PostEditor
              content={post.content}
              platform={post.platform}
              postId={post.id}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <PlatformPreview content={post.content} platform={post.platform} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
