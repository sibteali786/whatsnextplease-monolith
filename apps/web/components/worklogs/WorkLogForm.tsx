'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import TimeInput from './TimeInput';
import RichTextEditor from '../comments/RichTextEditor';
import { workLogApiClient, WorkLog } from '@/utils/time/worklogApiClient';
import {
  parseTimeToMinutes,
  calculateProgress,
  formatTimeFromMinutes,
} from '@/utils/time/timeUtils';
import { Progress } from '@/components/ui/progress';
import {
  workLogSchema,
  WorkLogFormData,
  getDefaultWorkLogValues,
} from '@/utils/validationSchemas/worklogSchemas';
import TimePicker from './TimePicker';

interface WorkLogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  onWorkLogAdded: (workLog: WorkLog) => void;
  editingWorkLog?: WorkLog;
  taskTimeForTask?: number | null;
  taskTotalTimeSpent?: number | null;
}

export default function WorkLogForm({
  open,
  onOpenChange,
  taskId,
  onWorkLogAdded,
  editingWorkLog,
  taskTimeForTask,
  taskTotalTimeSpent,
}: WorkLogFormProps) {
  const { toast } = useToast();
  const isEditing = !!editingWorkLog;

  // Initialize form with react-hook-form + zod
  const form = useForm<WorkLogFormData>({
    resolver: zodResolver(workLogSchema),
    defaultValues: getDefaultWorkLogValues(editingWorkLog),
    mode: 'onChange',
  });

  // Reset form when dialog opens/closes or editing changes
  useEffect(() => {
    if (open) {
      form.reset(getDefaultWorkLogValues(editingWorkLog));
    }
  }, [open, editingWorkLog, form]);

  useEffect(() => {
    const timeRemainingValue = form.watch('timeRemaining');
    const timeSpentValue = form.watch('timeSpent');

    // Only auto-fill if:
    // 1. Not editing (new work log)
    // 2. User hasn't manually entered time remaining
    // 3. Task has original estimate
    if (!isEditing && taskTimeForTask) {
      // Convert task's timeForTask from hours (Decimal) to minutes
      const originalEstimateMinutes = Math.round(taskTimeForTask * 60);

      // Calculate remaining = original estimate - already spent - current entry
      let calculatedRemaining = originalEstimateMinutes;

      if (taskTotalTimeSpent) {
        calculatedRemaining -= taskTotalTimeSpent;
      }

      if (timeSpentValue) {
        const currentSpentMinutes = parseTimeToMinutes(timeSpentValue);
        if (currentSpentMinutes) {
          calculatedRemaining -= currentSpentMinutes;
        }
      }

      // Don't allow negative remaining
      calculatedRemaining = Math.max(0, calculatedRemaining);

      // Format and set the value
      const currentRemainingMinutes = parseTimeToMinutes(timeRemainingValue || '');
      const shouldAutoFill =
        !timeRemainingValue || // Field is empty
        currentRemainingMinutes === null || // Invalid format (hasn't been manually set properly)
        calculatedRemaining !== currentRemainingMinutes; // Value changed, update it

      if (shouldAutoFill && calculatedRemaining >= 0) {
        const formattedRemaining = formatTimeFromMinutes(calculatedRemaining);
        // Only update if different to prevent infinite loop
        if (formattedRemaining !== timeRemainingValue) {
          form.setValue('timeRemaining', formattedRemaining, {
            shouldValidate: false, // Don't trigger validation
            shouldDirty: false, // Don't mark as dirty
          });
        }
      }
    }
  }, [
    form.watch('timeSpent'),
    form.watch('timeRemaining'),
    taskTimeForTask,
    taskTotalTimeSpent,
    isEditing,
    form,
  ]);

  // Watch time fields for progress calculation
  const timeSpent = form.watch('timeSpent');
  const timeRemaining = form.watch('timeRemaining');

  const timeSpentMinutes = parseTimeToMinutes(timeSpent);
  const timeRemainingMinutes = parseTimeToMinutes(timeRemaining || '');
  const progress =
    timeSpentMinutes && timeRemainingMinutes
      ? calculateProgress(timeSpentMinutes, timeRemainingMinutes)
      : 0;

  const hasProgress = timeSpentMinutes && timeRemainingMinutes;

  const onSubmit = async (data: WorkLogFormData) => {
    try {
      // Combine date and time
      const [hours = 0, minutes = 0] = data.startedTime.split(':').map(Number);
      const startedDateTime = new Date(data.startedAt);
      startedDateTime.setHours(hours, minutes, 0, 0);

      if (isEditing) {
        // Update existing work log
        const result = await workLogApiClient.updateWorkLog(editingWorkLog.id, {
          timeSpent: data.timeSpent,
          timeRemaining: data.timeRemaining?.trim() || undefined,
          startedAt: startedDateTime.toISOString(),
          description: data.description.trim(),
        });

        if (result.success && result.workLog) {
          onWorkLogAdded(result.workLog);
          toast({
            title: 'Work Log Updated',
            description: 'Your time entry has been updated successfully',
            variant: 'success',
          });
          handleClose();
        }
      } else {
        // Create new work log
        const result = await workLogApiClient.createWorkLog(taskId, {
          timeSpent: data.timeSpent,
          timeRemaining: data.timeRemaining?.trim() || undefined,
          startedAt: startedDateTime.toISOString(),
          description: data.description.trim(),
        });

        if (result.success && result.workLog) {
          onWorkLogAdded(result.workLog);
          toast({
            title: 'Work Log Added',
            description: 'Your time has been logged successfully',
            variant: 'success',
          });
          handleClose();
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save work log',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    form.reset(getDefaultWorkLogValues());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Work Log' : 'Time tracking'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {timeSpentMinutes ? formatTimeFromMinutes(timeSpentMinutes) : '0m'} logged
                </span>
                <span className="text-muted-foreground">
                  {timeRemainingMinutes ? formatTimeFromMinutes(timeRemainingMinutes) : '0m'}{' '}
                  remaining
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              {hasProgress && (
                <div className="text-xs text-muted-foreground text-right">{progress}% complete</div>
              )}
            </div>

            {/* Time Inputs Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="timeSpent"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <TimeInput
                        label="Time spent"
                        placeholder="1z"
                        required
                        error={form.formState.errors.timeSpent?.message}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeRemaining"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <TimeInput
                        label="Time remaining"
                        placeholder="1z"
                        showFormatHint={false}
                        error={form.formState.errors.timeRemaining?.message}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Format Hint */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Use the format: 2w 4d 6h 45m</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>w = weeks</li>
                <li>d = days</li>
                <li>h = hours</li>
                <li>m = minutes</li>
              </ul>
            </div>

            {/* Date Started */}
            <FormField
              control={form.control}
              name="startedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Date started <span className="text-destructive">*</span>
                  </FormLabel>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'flex-1 justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={date => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Time Picker */}
                    <FormField
                      control={form.control}
                      name="startedTime"
                      render={({ field }) => (
                        <TimePicker
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          disabled={form.formState.isSubmitting}
                        />
                        // Add an icon to trigger a time picker if desired
                      )}
                    />
                    {/* Clear Date Button */}
                    <FormField
                      control={form.control}
                      name="startedAt"
                      render={({ field }) => (
                        <>
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                field.onChange(undefined);
                                form.setValue('startedTime', format(new Date(), 'HH:mm'));
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Work Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Work description <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <RichTextEditor
                      content={field.value}
                      onChange={field.onChange}
                      onMentionsChange={() => {}} // Not using mentions in work logs
                      placeholder="Type /ai for Atlassian Intelligence or @ to mention and notify someone."
                      disabled={form.formState.isSubmitting}
                      taskId={taskId}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" />
                    <span>Saving...</span>
                  </div>
                ) : isEditing ? (
                  'Save'
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
