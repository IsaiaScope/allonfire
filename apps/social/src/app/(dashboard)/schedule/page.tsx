import { prisma } from "@allonfire/database";

export default async function SchedulePage() {
  const scheduled = await prisma.post.findMany({
    where: { status: "SCHEDULED" },
    orderBy: { scheduledAt: "asc" },
    include: { topic: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-2xl">Scheduled Posts</h1>

      {scheduled.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No posts scheduled. Approve drafts and set a publish time.
        </p>
      ) : (
        <div className="space-y-3">
          {scheduled.map((post) => (
            <div className="rounded-lg border bg-card p-4" key={post.id}>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground text-xs">
                      {post.platform}
                    </span>
                  </div>
                  {post.topic && (
                    <p className="font-medium text-sm">{post.topic.title}</p>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">
                  {post.scheduledAt?.toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
