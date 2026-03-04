import { prisma } from "@allonfire/database";

export default async function OverviewPage() {
  const [topicCount, draftCount, scheduledCount, publishedCount] =
    await Promise.all([
      prisma.topic.count({ where: { status: "DISCOVERED" } }),
      prisma.post.count({ where: { status: "DRAFT" } }),
      prisma.post.count({ where: { status: "SCHEDULED" } }),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
    ]);

  const stats = [
    { label: "Discovered Topics", value: topicCount },
    { label: "Draft Posts", value: draftCount },
    { label: "Scheduled", value: scheduledCount },
    { label: "Published", value: publishedCount },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-bold text-2xl">Overview</h1>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            className="rounded-lg border bg-card p-6 text-card-foreground"
            key={stat.label}
          >
            <p className="text-muted-foreground text-sm">{stat.label}</p>
            <p className="font-bold text-3xl">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
