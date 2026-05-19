"use client";

import { cn } from "@allonfire/ui/lib/utils";
import { Dialog } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type * as React from "react";
import { isValidElement, type ReactNode } from "react";

function Sheet({ ...props }: React.ComponentProps<typeof Dialog.Root>) {
  return <Dialog.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  asChild,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Dialog.Trigger>, "render"> & {
  asChild?: boolean;
  children?: ReactNode;
}) {
  if (asChild && isValidElement(children)) {
    return (
      <Dialog.Trigger data-slot="sheet-trigger" render={children} {...props} />
    );
  }
  return (
    <Dialog.Trigger data-slot="sheet-trigger" {...props}>
      {children}
    </Dialog.Trigger>
  );
}

function SheetClose({
  asChild,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Dialog.Close>, "render"> & {
  asChild?: boolean;
  children?: ReactNode;
}) {
  if (asChild && isValidElement(children)) {
    return (
      <Dialog.Close data-slot="sheet-close" render={children} {...props} />
    );
  }
  return (
    <Dialog.Close data-slot="sheet-close" {...props}>
      {children}
    </Dialog.Close>
  );
}

const sheetContentVariants = cva(
  "fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition-transform duration-300 ease-in-out data-open:translate-x-0 data-open:translate-y-0",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 -translate-y-full border-b",
        bottom: "inset-x-0 bottom-0 translate-y-full border-t",
        left: "inset-y-0 left-0 h-full w-3/4 max-w-sm -translate-x-full border-r",
        right:
          "inset-y-0 right-0 h-full w-3/4 max-w-sm translate-x-full border-l",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
);

function SheetContent({
  side = "right",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Dialog.Popup> &
  VariantProps<typeof sheetContentVariants>) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop
        className="fixed inset-0 z-50 bg-black/50 transition-opacity data-closed:opacity-0 data-open:opacity-100"
        data-slot="sheet-backdrop"
      />
      <Dialog.Popup
        className={cn(sheetContentVariants({ side }), className)}
        data-slot="sheet-content"
        {...props}
      >
        {children}
        <Dialog.Close className="absolute top-4 right-4 cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Dialog.Close>
      </Dialog.Popup>
    </Dialog.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-6 text-center sm:text-left",
        className
      )}
      data-slot="sheet-header"
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      className={cn("font-semibold text-foreground text-lg", className)}
      data-slot="sheet-title"
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Description>) {
  return (
    <Dialog.Description
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="sheet-description"
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-auto flex flex-col gap-2 p-6", className)}
      data-slot="sheet-footer"
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
};
