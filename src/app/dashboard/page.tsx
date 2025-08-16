"use client";

import { useTimeTracking } from "@/hooks/useTimeTracking";
import { OrganizationList } from "@/components/dashboard/OrganizationList";
import { ActiveTimer } from "@/components/dashboard/ActiveTimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, TrendingUp } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

export default function DashboardPage() {
  const { organizations, timeEntries, activeTimeEntry, elapsedTime } =
    useTimeTracking();

  // Get the project for the active time entry
  const activeOrganization = activeTimeEntry
    ? organizations.find((org) => org.id === activeTimeEntry.organizationId)
    : null;

  // Calculate some basic stats
  const thisWeek = eachDayOfInterval({
    start: startOfWeek(new Date()),
    end: endOfWeek(new Date()),
  });

  const thisWeekEntries = timeEntries.filter(
    (entry) =>
      entry.endTime &&
      thisWeek.some(
        (day) =>
          format(entry.endTime!, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
      ),
  );

  const totalMinutesThisWeek = thisWeekEntries.reduce((total, entry) => {
    if (entry.endTime) {
      return (
        total +
        Math.round(
          (entry.endTime.getTime() - entry.startTime.getTime()) / (1000 * 60),
        )
      );
    }
    return total;
  }, 0);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const StatsCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{organizations.length}</div>
          <p className="text-xs text-muted-foreground">
            {organizations.filter((org) => org.isPinned).length} pinned
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Week</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatDuration(totalMinutesThisWeek)}
          </div>
          <p className="text-xs text-muted-foreground">
            {thisWeekEntries.length} sessions
          </p>
        </CardContent>
      </Card>

      <Card className="sm:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{timeEntries.length}</div>
          <p className="text-xs text-muted-foreground">
            {timeEntries.filter((entry) => !entry.endTime).length} active
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="w-full max-w-none px-4 md:px-8 py-6 md:py-8 overflow-x-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Mobile: Active timer on top */}
          {activeTimeEntry && activeOrganization && (
            <div className="lg:hidden">
              <ActiveTimer
                timeEntry={activeTimeEntry}
                organization={activeOrganization}
                elapsedTime={elapsedTime}
              />
            </div>
          )}

          {/* Mobile: Stats below timer */}
          <div className="lg:hidden">
            <StatsCards />
          </div>

          {/* Projects */}
          <OrganizationList
            organizations={organizations}
            activeTimeEntry={activeTimeEntry}
            elapsedTime={elapsedTime}
          />
        </div>

        {/* Sidebar column */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20 lg:self-start">
          {/* Desktop: Active timer */}
          {activeTimeEntry && activeOrganization && (
            <div className="hidden lg:block">
              <ActiveTimer
                timeEntry={activeTimeEntry}
                organization={activeOrganization}
                elapsedTime={elapsedTime}
              />
            </div>
          )}

          {/* Desktop: Stats */}
          <div className="hidden lg:block">
            <StatsCards />
          </div>
        </div>
      </div>
    </div>
  );
}
