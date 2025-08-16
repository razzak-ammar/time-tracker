"use client";

import { useTimeTracking } from "@/hooks/useTimeTracking";
import { PinnedOrganizationCard } from "@/components/organizations/PinnedOrganizationCard";
import { OrganizationForm } from "@/components/organizations/OrganizationForm";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function PinnedPage() {
  const { getPinnedOrganizations } = useTimeTracking();
  const [showAddForm, setShowAddForm] = useState(false);

  const pinnedOrganizations = getPinnedOrganizations();

  return (
    <div className="w-full max-w-none p-4 md:p-8 space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Pinned
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
            Quick access to your most important projects
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-md text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add Project</span>
            <span className="sm:hidden">Add</span>
          </Button>

          <Link href="/dashboard">
            <Button
              variant="outline"
              size="icon"
              className="hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Projects Grid */}
      {pinnedOrganizations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {pinnedOrganizations.map((organization) => (
            <PinnedOrganizationCard
              key={organization.id}
              organization={organization}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-full flex items-center justify-center mb-6">
            <Plus className="w-10 h-10 md:w-12 md:h-12 text-gray-400" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3">
            No pinned projects
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm text-sm md:text-base">
            Pin your most important projects here for quick access.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
            <Link href="/dashboard">
              <Button
                variant="outline"
                className="hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Add Project Form */}
      <OrganizationForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onSuccess={() => setShowAddForm(false)}
      />
    </div>
  );
}
