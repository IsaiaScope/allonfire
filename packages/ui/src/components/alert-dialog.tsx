"use client";

import { cn } from "@allonfire/ui/lib/utils";
import { Dialog } from "@base-ui/react/dialog";
import type * as React from "react";
import { isValidElement, type ReactNode } from "react";

function AlertDialog({ ...props }: React.ComponentProps<typeof Dialog.Root>) {
  return <Dialog.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({
  asChild,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Dialog.Trigger>, "render"> & {
  asChild?: boolean;
  children?: ReactNode;
}) {
  if (asChild && isValidElement(children)) {
    return (
      <Dialog.Trigger
        data-slot="alert-dialog-trigger"
        render={children}
        {...props}
      />
    );
  }
  return (
    <Dialog.Trigger data-slot="alert-dialog-trigger" {...props}>
      {children}
    </Dialog.Trigger>
  );
}

function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Dialog.Popup>) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop
        className="fixed inset-0 z-50 bg-black/50 transition-opacity data-[closed]:opacity-0 data-[open]:opacity-100"
        data-slot="alert-dialog-backdrop"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <Dialog.Popup
          className={cn(
            "mx-4 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg transition-all",
            "data-[open]:fade-in-0 data-[open]:zoom-in-95 data-[open]:animate-in",
            "data-[closed]:fade-out-0 data-[closed]:zoom-out-95 data-[closed]:animate-out",
            className
          )}
          data-slot="alert-dialog-content"
          {...props}
        >
          {children}
        </Dialog.Popup>
      </div>
    </Dialog.Portal>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-slot="alert-dialog-header"
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      className={cn("font-semibold text-foreground text-lg", className)}
      data-slot="alert-dialog-title"
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Description>) {
  return (
    <Dialog.Description
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="alert-dialog-description"
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-4 flex justify-end gap-2", className)}
      data-slot="alert-dialog-footer"
      {...props}
    />
  );
}

function AlertDialogClose({
  asChild,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Dialog.Close>, "render"> & {
  asChild?: boolean;
  children?: ReactNode;
}) {
  if (asChild && isValidElement(children)) {
    return (
      <Dialog.Close
        data-slot="alert-dialog-close"
        render={children}
        {...props}
      />
    );
  }
  return (
    <Dialog.Close data-slot="alert-dialog-close" {...props}>
      {children}
    </Dialog.Close>
  );
}

function AlertDialogAction({
  asChild,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Dialog.Close>, "render"> & {
  asChild?: boolean;
  children?: ReactNode;
}) {
  if (asChild && isValidElement(children)) {
    return (
      <Dialog.Close
        data-slot="alert-dialog-action"
        render={children}
        {...props}
      />
    );
  }
  return (
    <Dialog.Close
      className={cn(
        "inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-destructive px-4 font-medium text-destructive-foreground text-sm shadow-sm transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        props.className
      )}
      data-slot="alert-dialog-action"
      {...props}
    >
      {children}
    </Dialog.Close>
  );
}

function AlertDialogCancel({
  asChild,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Dialog.Close>, "render"> & {
  asChild?: boolean;
  children?: ReactNode;
}) {
  if (asChild && isValidElement(children)) {
    return (
      <Dialog.Close
        data-slot="alert-dialog-cancel"
        render={children}
        {...props}
      />
    );
  }
  return (
    <Dialog.Close
      className={cn(
        "inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 font-medium text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        props.className
      )}
      data-slot="alert-dialog-cancel"
      {...props}
    >
      {children}
    </Dialog.Close>
  );
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
  AlertDialogAction,
  AlertDialogCancel,
};
