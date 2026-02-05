import { z } from 'zod';

/**
 * Validation schema for WorkLog form
 */
export const workLogSchema = z.object({
  timeSpent: z
    .string()
    .min(1, 'Time spent is required')
    .refine(
      val => {
        // Validate format: 1w 2d 3h 4m
        const regex = /^\s*(?:(\d+)w)?\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*$/i;
        return regex.test(val.trim());
      },
      {
        message: 'Invalid format. Use: 2w 4d 6h 45m',
      }
    )
    .refine(
      val => {
        // Ensure at least one time unit is provided
        const regex = /^\s*(?:(\d+)w)?\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*$/i;
        const match = val.trim().match(regex);
        if (!match) return false;
        const [, weeks, days, hours, minutes] = match;
        return !!(weeks || days || hours || minutes);
      },
      {
        message: 'Time must be greater than 0',
      }
    ),

  timeRemaining: z
    .string()
    .optional()
    .refine(
      val => {
        if (!val || val.trim() === '') return true; // Optional field
        const regex = /^\s*(?:(\d+)w)?\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*$/i;
        return regex.test(val.trim());
      },
      {
        message: 'Invalid format. Use: 2w 4d 6h 45m',
      }
    ),

  startedAt: z
    .date({
      required_error: 'Date is required',
      invalid_type_error: 'Invalid date',
    })
    .refine(date => date <= new Date(), {
      message: 'Date cannot be in the future',
    }),

  startedTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),

  description: z
    .string()
    .transform(val => {
      // First, normalize the value - strip empty HTML tags
      if (!val) return '';

      const normalized = val.trim();

      // Common empty states from RichTextEditor
      const emptyPatterns = ['', '<p></p>', '<p><br></p>', '<p> </p>', '<p><br/></p>', '<p>\n</p>'];

      if (emptyPatterns.includes(normalized)) {
        return '';
      }

      return normalized;
    })
    .refine(
      val => {
        // If empty after normalization, it's valid (optional)
        if (!val || val === '') return true;

        // If provided, check meaningful content (strip HTML for length)
        const textOnly = val.replace(/<[^>]*>/g, '').trim();
        return textOnly.length >= 3;
      },
      {
        message: 'Description must be at least 3 characters when provided',
      }
    )
    .refine(
      val => {
        if (!val) return true;
        return val.length <= 10000;
      },
      {
        message: 'Description is too long (max 10,000 characters)',
      }
    )
    .transform(val => {
      // Final transform: convert empty to undefined for API
      return val === '' ? undefined : val;
    })
    .optional(),
});

export type WorkLogFormData = z.infer<typeof workLogSchema>;

/**
 * Create default form values
 */
export const getDefaultWorkLogValues = (editingWorkLog?: {
  timeSpent: number;
  timeRemaining: number | null;
  startedAt: string;
  description?: string;
}): Partial<WorkLogFormData> => {
  if (!editingWorkLog) {
    return {
      timeSpent: '',
      timeRemaining: '',
      startedAt: new Date(),
      startedTime: new Date().toTimeString().slice(0, 5), // HH:mm format
      description: '',
    };
  }

  // Helper to format minutes to time string
  const formatTime = (minutes: number): string => {
    let remaining = minutes;
    const parts: string[] = [];

    const weeks = Math.floor(remaining / 2400);
    if (weeks > 0) {
      parts.push(`${weeks}w`);
      remaining %= 2400;
    }

    const days = Math.floor(remaining / 480);
    if (days > 0) {
      parts.push(`${days}d`);
      remaining %= 480;
    }

    const hours = Math.floor(remaining / 60);
    if (hours > 0) {
      parts.push(`${hours}h`);
      remaining %= 60;
    }

    if (remaining > 0) {
      parts.push(`${remaining}m`);
    }

    return parts.join(' ') || '0m';
  };

  const startedDate = new Date(editingWorkLog.startedAt);

  return {
    timeSpent: formatTime(editingWorkLog.timeSpent),
    timeRemaining: editingWorkLog.timeRemaining ? formatTime(editingWorkLog.timeRemaining) : '',
    startedAt: startedDate,
    startedTime: startedDate.toTimeString().slice(0, 5),
    description: editingWorkLog.description,
  };
};
