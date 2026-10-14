"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <h1 className="font-heading text-lg font-semibold">
            Something went wrong
          </h1>
          <p className="mt-1 text-sm text-muted">
            The console hit an unexpected error. You can try again, or reload
            the page.
          </p>
          <Button className="mt-4" onClick={reset}>
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
