"use client";

import { CircleCheck, CircleX, Info } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      className="toaster group"
      icons={{
        error: <CircleX className="size-4" />,
        info: <Info className="size-4" />,
        success: <CircleCheck className="size-4" />,
      }}
      theme={theme as NonNullable<ToasterProps["theme"]>}
      toastOptions={{
        classNames: {
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          description:
            "group-[.toast]:text-muted-foreground group-[.toast]:line-clamp-[15] group-data-[type=success]:!text-emerald-700 dark:group-data-[type=success]:!text-emerald-300 group-data-[type=error]:!text-red-700 dark:group-data-[type=error]:!text-red-300 group-data-[type=info]:!text-blue-700 dark:group-data-[type=info]:!text-blue-300",
          error:
            "group-[.toaster]:!bg-red-50 group-[.toaster]:!text-red-900 group-[.toaster]:!border-red-200 dark:group-[.toaster]:!bg-red-950 dark:group-[.toaster]:!text-red-100 dark:group-[.toaster]:!border-red-800",
          icon: "mt-0.5",
          info: "group-[.toaster]:!bg-blue-50 group-[.toaster]:!text-blue-900 group-[.toaster]:!border-blue-200 dark:group-[.toaster]:!bg-blue-950 dark:group-[.toaster]:!text-blue-100 dark:group-[.toaster]:!border-blue-800",
          success:
            "group-[.toaster]:!bg-emerald-50 group-[.toaster]:!text-emerald-900 group-[.toaster]:!border-emerald-200 dark:group-[.toaster]:!bg-emerald-950 dark:group-[.toaster]:!text-emerald-100 dark:group-[.toaster]:!border-emerald-800",
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:!items-start",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
