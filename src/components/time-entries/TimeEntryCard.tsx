'use client';

import { TimeEntry, Organization } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Edit, Trash2, Calendar } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { updateTimeEntry, deleteTimeEntry } from '@/lib/firebase-service';

interface TimeEntryCardProps {
  timeEntry: TimeEntry;
  organization: Organization;
  onUpdate?: () => void;
}

export function TimeEntryCard({ timeEntry, organization, onUpdate }: TimeEntryCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [startTime, setStartTime] = useState(format(timeEntry.startTime, "yyyy-MM-dd'T'HH:mm"));
  const [endTime, setEndTime] = useState(timeEntry.endTime ? format(timeEntry.endTime, "yyyy-MM-dd'T'HH:mm") : '');
  const [description, setDescription] = useState(timeEntry.description || '');
  const [loading, setLoading] = useState(false);

  const duration = timeEntry.endTime 
    ? Math.round((timeEntry.endTime.getTime() - timeEntry.startTime.getTime()) / (1000 * 60))
    : Math.round((new Date().getTime() - timeEntry.startTime.getTime()) / (1000 * 60));

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateTimeEntry(timeEntry.id, {
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : undefined,
        description: description.trim() || undefined,
      });
      onUpdate?.();
      setEditOpen(false);
    } catch (error) {
      console.error('Error updating time entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this time entry?')) return;
    
    setLoading(true);
    try {
      await deleteTimeEntry(timeEntry.id);
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting time entry:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: organization.color }}
              />
              <CardTitle className="text-base">{organization.name}</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={timeEntry.isActive ? "default" : "secondary"}>
                {timeEntry.isActive ? 'Active' : 'Completed'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(timeEntry.startTime, 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
          
          <div className="text-sm space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">Started:</span>
              <span>{format(timeEntry.startTime, 'h:mm a')}</span>
            </div>
            {timeEntry.endTime && (
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground">Ended:</span>
                <span>{format(timeEntry.endTime, 'h:mm a')}</span>
              </div>
            )}
          </div>
          
          {timeEntry.description && (
            <div className="text-sm text-muted-foreground">
              {timeEntry.description}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you work on?"
                rows={3}
              />
            </div>
            
            <div className="flex justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              
              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
