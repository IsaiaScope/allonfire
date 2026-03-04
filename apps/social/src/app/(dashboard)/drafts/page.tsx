import { prisma } from "@allonfire/database";

export default async function DraftsPage() {
  const drafts = await prisma.post.findMany({
    where: { status: "DRAFT" },
    orderBy: { createdAt: "desc" },
    include: { topic: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-2xl">Draft Posts</h1>
        <p className="text-muted-foreground text-sm">
          {drafts.length} drafts ready for review
        </p>
      </div>

      {drafts.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No draft posts. Generate content from selected topics first.
        </p>
      ) : (
        <div className="space-y-3">
          {drafts.map((post) => (
            <div className="rounded-lg border bg-card p-4" key={post.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground text-xs">
                      {post.platform}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {post.type}
                    </span>
                  </div>
                  {post.topic && (
                    <p className="text-muted-foreground text-xs">
                      Topic: {post.topic.title}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-sm">
                    {post.content.slice(0, 300)}
                    {post.content.length > 300 ? "..." : ""}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
