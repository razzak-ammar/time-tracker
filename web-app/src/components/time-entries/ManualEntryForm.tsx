"use client";

import { useState, useEffect, useMemo } from "react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Project } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Clock, Calendar, X, Check } from "lucide-react";
import { format, subDays } from "date-fns";

interface ManualEntryButtonProps {
    onToggleExpanded: (expanded: boolean) => void;
}

interface ManualEntryFormProps {
    onEntryCreated?: () => void;
    onCancel: () => void;
}

export function ManualEntryButton({ onToggleExpanded }: ManualEntryButtonProps) {
    return (
        <Button
            variant="outline"
            onClick={() => onToggleExpanded(true)}
            className="h-8 px-3 flex items-center gap-2 text-foreground text-xs border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
        >
            <Plus className="h-3 w-3" />
            <span>Add Manual Entry</span>
        </Button>
    );
}

export function ManualEntryFormContent({ onEntryCreated, onCancel }: ManualEntryFormProps) {
    const { projects, mostRecentlyUsedProject, createManualEntry } = useTimeTracking();
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [errors, setErrors] = useState<{
        startTime?: string;
        endTime?: string;
        project?: string;
    }>({});

    // Set default project when mostRecentlyUsedProject changes
    useEffect(() => {
        if (mostRecentlyUsedProject && !selectedProjectId) {
            setSelectedProjectId(mostRecentlyUsedProject.id);
        }
    }, [mostRecentlyUsedProject, selectedProjectId]);

    // Generate date options (last 7 days)
    const dateOptions = useMemo(() => {
        const options = [];
        const today = new Date();

        for (let i = 0; i < 7; i++) {
            const date = subDays(today, i);
            const dateStr = format(date, "yyyy-MM-dd");

            let label;
            if (i === 0) {
                label = "Today";
            } else if (i === 1) {
                label = "Yesterday";
            } else {
                label = format(date, "EEEE, MMM d");
            }

            options.push({ value: dateStr, label, date });
        }

        return options;
    }, []);

    // Calculate duration preview
    const duration = useMemo(() => {
        if (!startTime || !endTime) return null;

        try {
            const start = new Date(`${selectedDate.toISOString().split('T')[0]}T${startTime}`);
            const end = new Date(`${selectedDate.toISOString().split('T')[0]}T${endTime}`);

            if (end <= start) return null;

            const diffMs = end.getTime() - start.getTime();
            const minutes = Math.round(diffMs / (1000 * 60));
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;

            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        } catch {
            return null;
        }
    }, [startTime, endTime, selectedDate]);

    const validateForm = () => {
        const newErrors: typeof errors = {};

        if (!startTime) {
            newErrors.startTime = "Start time is required";
        }

        if (!endTime) {
            newErrors.endTime = "End time is required";
        } else if (startTime && endTime <= startTime) {
            newErrors.endTime = "End time must be after start time";
        }

        if (!selectedProjectId) {
            newErrors.project = "Please select a project";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const startDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${startTime}`);
            const endDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${endTime}`);

            await createManualEntry(selectedProjectId, startDateTime, endDateTime);

            // Reset form
            setStartTime("");
            setEndTime("");
            setErrors({});
            onEntryCreated?.();
        } catch (error) {
            console.error("Error creating manual entry:", error);
            setErrors({ project: "Failed to create entry. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setStartTime("");
        setEndTime("");
        setErrors({});
        onCancel();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            handleCancel();
        } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <Card className="bg-gray-900 dark:bg-gray-800 border border-gray-700 dark:border-gray-600 shadow-lg animate-in slide-in-from-top-2 duration-300 ease-out">
            <CardContent className="p-4">
                <div onKeyDown={handleKeyDown}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-white flex items-center gap-2 animate-in fade-in duration-200">
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                <Clock className="h-3 w-3 text-white" />
                            </div>
                            Add Manual Entry
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancel}
                            className="h-6 w-6 p-0 animate-in fade-in duration-200 hover:bg-gray-700 text-gray-400 hover:text-white"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>

                    {/* Responsive Form Layout */}
                    <div className="space-y-3 animate-in slide-in-from-top-4 duration-300 delay-100">
                        {/* Top Row: Date and Project */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Date Selector */}
                            <div className="w-full sm:w-40">
                                <Select
                                    value={format(selectedDate, "yyyy-MM-dd")}
                                    onValueChange={(value) => setSelectedDate(new Date(value))}
                                >
                                    <SelectTrigger className="h-8 bg-gray-800 border-gray-600 text-white text-xs">
                                        <SelectValue placeholder="Date" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-600">
                                        {dateOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value} className="text-white hover:bg-gray-700 text-xs">
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Project Selector */}
                            <div className="flex-1 min-w-0">
                                <Select
                                    value={selectedProjectId}
                                    onValueChange={setSelectedProjectId}
                                >
                                    <SelectTrigger className="h-8 bg-gray-800 border-gray-600 text-white text-xs">
                                        <SelectValue placeholder="Project" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-600">
                                        {projects.map((project) => (
                                            <SelectItem key={project.id} value={project.id} className="text-white hover:bg-gray-700 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: project.color }}
                                                    />
                                                    {project.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.project && (
                                    <p className="text-xs text-red-400 mt-1 animate-in fade-in duration-200">{errors.project}</p>
                                )}
                            </div>
                        </div>

                        {/* Bottom Row: Time Inputs, Duration, and Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            {/* Time Inputs */}
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Input
                                    id="start-time"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className={`h-8 w-full sm:w-24 bg-gray-800 border-gray-600 text-white text-xs focus:border-blue-500 ${errors.startTime ? "border-red-500" : ""}`}
                                    placeholder="Start"
                                    autoFocus
                                />
                                <span className="text-xs text-gray-400 whitespace-nowrap">to</span>
                                <Input
                                    id="end-time"
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className={`h-8 w-full sm:w-24 bg-gray-800 border-gray-600 text-white text-xs focus:border-blue-500 ${errors.endTime ? "border-red-500" : ""}`}
                                    placeholder="End"
                                />
                            </div>

                            {/* Duration Preview */}
                            {duration && (
                                <div className="px-2 py-1 bg-green-600/20 border border-green-600/30 rounded text-xs text-green-400 animate-in fade-in duration-200 whitespace-nowrap">
                                    {duration}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 w-full sm:w-auto justify-end sm:justify-start">
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={loading}
                                    size="sm"
                                    className="h-8 px-3 text-xs border-gray-600 text-gray-300 hover:bg-gray-700 flex-1 sm:flex-none"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={loading || !startTime || !endTime || !selectedProjectId}
                                    className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-xs flex-1 sm:flex-none"
                                    size="sm"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                                            Save
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-3 w-3 mr-1" />
                                            Save
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Error Messages */}
                    {(errors.startTime || errors.endTime) && (
                        <div className="animate-in fade-in duration-200">
                            {errors.startTime && (
                                <p className="text-xs text-red-400 mb-1">{errors.startTime}</p>
                            )}
                            {errors.endTime && (
                                <p className="text-xs text-red-400">{errors.endTime}</p>
                            )}
                        </div>
                    )}

                    {/* Keyboard Shortcuts */}
                    <div className="flex items-center justify-center text-xs text-gray-500 animate-in fade-in duration-300 delay-200">
                        <span>
                            <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">⌘+Enter</kbd> to save, <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">Esc</kbd> to cancel
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}