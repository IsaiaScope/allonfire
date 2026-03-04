import { prisma } from "@allonfire/database";

export default async function GeneratePage() {
  const selectedTopics = await prisma.topic.findMany({
    where: { status: { in: ["SELECTED", "GENERATING"] } },
    orderBy: { discoveredAt: "desc" },
    include: { posts: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-2xl">Generate Content</h1>

      {selectedTopics.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No topics selected for generation. Select topics from the Discover
          page first.
        </p>
      ) : (
        <div className="space-y-4">
          {selectedTopics.map((topic) => (
            <div className="rounded-lg border bg-card p-4" key={topic.id}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{topic.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    Status: {topic.status} — {topic.posts.length} posts
                    generated
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs">
                  {topic.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
