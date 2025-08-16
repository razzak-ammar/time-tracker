"use client";

import { useState, useEffect } from "react";
import { Organization } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createOrganization, updateOrganization } from "@/lib/firebase-service";
import { useAuth } from "@/contexts/AuthContext";
import { Check } from "lucide-react";

interface OrganizationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: Organization | null;
  onSuccess?: () => void;
}

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#84cc16",
  "#14b8a6",
  "#f59e0b",
  "#6366f1",
];

export function OrganizationForm({
  open,
  onOpenChange,
  organization,
  onSuccess,
}: OrganizationFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setColor(organization.color);
    } else {
      setName("");
      setColor(COLORS[0]);
    }
  }, [organization, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);

    try {
      if (organization) {
        await updateOrganization(organization.id, { name: name.trim(), color });
      } else {
        await createOrganization({
          name: name.trim(),
          color,
          userId: user.uid,
          isPinned: false,
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving project:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {organization ? "Edit Project" : "Add Project"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-6 gap-3">
              {COLORS.map((colorOption) => {
                const isSelected = color === colorOption;
                return (
                  <button
                    key={colorOption}
                    type="button"
                    className={`
                      relative w-10 h-10 rounded-full border-2 transition-all duration-200 ease-in-out
                      hover:scale-110 hover:shadow-lg active:scale-95
                      ${
                        isSelected
                          ? "border-gray-800 dark:border-gray-200 shadow-lg scale-110"
                          : "border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400"
                      }
                    `}
                    style={{ backgroundColor: colorOption }}
                    onClick={() => setColor(colorOption)}
                    aria-label={`Select color ${colorOption}`}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm">
                          <Check className="w-3 h-3 text-gray-800 dark:text-gray-200" />
                        </div>
                      </div>
                    )}
                    <span className="sr-only">Color {colorOption}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <div
                className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Selected: {color.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {organization ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
