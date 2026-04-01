"use client";

import "../globals.css";
import { Flame, RefreshCw } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html className="dark" lang="en">
      <body
        className="flex min-h-dvh flex-col items-center justify-center bg-background font-sans antialiased"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at center, rgba(194,130,50,0.08) 0%, transparent 60%)",
        }}
      >
        <div className="flex flex-col items-center gap-6 px-4 text-center">
          <div className="rounded-full bg-destructive/10 p-5">
            <Flame className="size-20" style={{ color: "#c28232" }} />
          </div>

          <div className="space-y-2">
            <h1 className="font-bold text-3xl text-foreground tracking-tight">
              Critical Error
            </h1>
            <p className="max-w-sm text-muted-foreground">
              The application encountered a critical failure. Please try
              refreshing.
            </p>
          </div>

          <button
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-primary px-6 font-medium text-primary-foreground text-sm shadow-md transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            onClick={reset}
            type="button"
          >
            <RefreshCw className="size-4" />
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
