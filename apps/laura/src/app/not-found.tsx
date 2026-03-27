import { Button } from "@allonfire/ui/components/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h2 className="font-semibold text-xl">Page not found</h2>
      <Button asChild variant="outline">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
