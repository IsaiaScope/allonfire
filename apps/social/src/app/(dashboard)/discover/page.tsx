import { prisma } from "@allonfire/database";

export default async function DiscoverPage() {
  const topics = await prisma.topic.findMany({
    where: { status: "DISCOVERED" },
    orderBy: { discoveredAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-2xl">Discover Topics</h1>
        <p className="text-muted-foreground text-sm">
          {topics.length} topics waiting for review
        </p>
      </div>

      {topics.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No discovered topics yet. n8n will populate this automatically.
        </p>
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => (
            <div className="rounded-lg border bg-card p-4" key={topic.id}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium">{topic.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {topic.summary}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {topic.category}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {topic.sourceName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
