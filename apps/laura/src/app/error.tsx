"use client";

import { Button } from "@allonfire/ui/components/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h2 className="font-semibold text-xl">Something went wrong</h2>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
