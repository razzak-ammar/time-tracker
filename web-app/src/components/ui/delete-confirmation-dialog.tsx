"use client";

import { useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Delete action failed:", error);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !pending && onOpenChange(nextOpen)}
    >
      <DialogContent
        showCloseButton={false}
        className="delete-confirmation-panel max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-3xl border-border/60 bg-[hsl(var(--popover))] p-0 text-[hsl(var(--popover-foreground))] shadow-2xl sm:max-w-[420px]"
      >
        <div className="px-6 pb-5 pt-6 sm:px-7 sm:pt-7">
          <span className="delete-confirmation-icon flex size-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <Trash2 className="size-5" />
          </span>
          <DialogHeader className="mt-5 gap-2 text-left">
            <DialogTitle className="text-xl tracking-[-0.025em]">
              {title}
            </DialogTitle>
            <DialogDescription className="max-w-sm text-sm leading-6">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="h-10 rounded-full px-5 text-sm text-muted-foreground shadow-none hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={pending}
            className="h-10 rounded-full bg-destructive px-5 text-sm font-semibold text-destructive-foreground shadow-none hover:bg-destructive/90"
          >
            {pending ? (
              <LoaderCircle className="mr-2 size-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 size-4" />
            )}
            {pending ? "Deleting" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
