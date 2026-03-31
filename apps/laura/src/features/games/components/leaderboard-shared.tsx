import { Badge } from "@allonfire/ui/components/badge";

export function getInitials(name: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return "?";
}

export function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return <Badge className="bg-yellow-500 text-white">1st</Badge>;
  }
  if (rank === 2) {
    return <Badge className="bg-gray-400 text-white">2nd</Badge>;
  }
  if (rank === 3) {
    return <Badge className="bg-amber-700 text-white">3rd</Badge>;
  }
  return <span className="text-muted-foreground text-sm">{rank}</span>;
}
