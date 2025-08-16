"use client";

import { useTimeTracking } from "@/hooks/useTimeTracking";
import { TimeEntryCard } from "@/components/time-entries/TimeEntryCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Calendar } from "lucide-react";
import { useState, useMemo } from "react";
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

export default function TimeEntriesPage() {
  const { timeEntries, organizations } = useTimeTracking();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrganization, setSelectedOrganization] =
    useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");

  // Create a map of organizations for quick lookup
  const organizationMap = useMemo(() => {
    const map = new Map();
    organizations.forEach((org) => map.set(org.id, org));
    return map;
  }, [organizations]);

  // Filter time entries based on search, organization, and time filter
  const filteredEntries = useMemo(() => {
    let filtered = timeEntries;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((entry) => {
        const org = organizationMap.get(entry.organizationId);
        return (
          org?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Filter by organization
    if (selectedOrganization !== "all") {
      filtered = filtered.filter(
        (entry) => entry.organizationId === selectedOrganization,
      );
    }

    // Filter by time period
    const now = new Date();
    switch (timeFilter) {
      case "today":
        filtered = filtered.filter((entry) => {
          const entryDate = entry.startTime;
          return entryDate >= startOfDay(now) && entryDate <= endOfDay(now);
        });
        break;
      case "yesterday":
        const yesterday = subDays(now, 1);
        filtered = filtered.filter((entry) => {
          const entryDate = entry.startTime;
          return (
            entryDate >= startOfDay(yesterday) &&
            entryDate <= endOfDay(yesterday)
          );
        });
        break;
      case "this-week":
        filtered = filtered.filter((entry) => {
          const entryDate = entry.startTime;
          return entryDate >= startOfWeek(now) && entryDate <= endOfWeek(now);
        });
        break;
      case "this-month":
        filtered = filtered.filter((entry) => {
          const entryDate = entry.startTime;
          return entryDate >= startOfMonth(now) && entryDate <= endOfMonth(now);
        });
        break;
    }

    return filtered.sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime(),
    );
  }, [
    timeEntries,
    searchTerm,
    selectedOrganization,
    timeFilter,
    organizationMap,
  ]);

  // Calculate total time for filtered entries
  const totalTime = useMemo(() => {
    return filteredEntries.reduce((total, entry) => {
      if (entry.endTime) {
        return total + (entry.endTime.getTime() - entry.startTime.getTime());
      }
      return total;
    }, 0);
  }, [filteredEntries]);

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.round(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
        <h1 className="text-3xl font-bold">Time Entries</h1>
        <div className="text-sm text-muted-foreground">
          Total: {formatDuration(totalTime)}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 not-focus:text-white"
              />
            </div>

            <Select
              value={selectedOrganization}
              onValueChange={setSelectedOrganization}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries List */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No time entries found
              </h3>
              <p className="text-muted-foreground text-center">
                {searchTerm ||
                selectedOrganization !== "all" ||
                timeFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "Start tracking time to see your entries here."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map((entry) => {
            const organization = organizationMap.get(entry.organizationId);
            if (!organization) return null;

            return (
              <TimeEntryCard
                key={entry.id}
                timeEntry={entry}
                organization={organization}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
