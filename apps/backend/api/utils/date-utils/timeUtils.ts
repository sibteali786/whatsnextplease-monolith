/**
 * Time Utilities for Work Log Feature
 * Handles parsing and formatting of time strings (e.g., "1w 2d 3h 4m")
 */

/**
 * Parse human-readable time string to total minutes
 * Supports: w (weeks), d (days), h (hours), m (minutes)
 * Examples: "2w 1d 5h 30m", "4d", "5h 30m", "60m", "3w"
 *
 * Conversion rates:
 * - 1 week = 5 working days = 40 hours
 * - 1 day = 8 working hours
 * - 1 hour = 60 minutes
 *
 * @param timeString - Human-readable time (e.g., "1d 2h 30m")
 * @returns Total minutes, or null if invalid format
 */

export function parseTimeToMinutes(timeString: string): number | null {
  if (!timeString || typeof timeString !== 'string') {
    return null;
  }

  // Pattern matches optional groups of w, d, h, m
  // Case-insensitive, allows flexible spacing
  const regex = /^\s*(?:(\d+)w)?\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*$/i;
  const match = timeString.trim().match(regex);

  if (!match) {
    return null;
  }

  const [, weeks, days, hours, minutes] = match;

  // If all are undefined, no valid time unit was provided
  if (!weeks && !days && !hours && !minutes) {
    return null;
  }

  const weeksNum = weeks ? parseInt(weeks, 10) : 0;
  const daysNum = days ? parseInt(days, 10) : 0;
  const hoursNum = hours ? parseInt(hours, 10) : 0;
  const minutesNum = minutes ? parseInt(minutes, 10) : 0;

  // Validate ranges (reasonable limits)
  if (weeksNum > 520 || daysNum > 365 || hoursNum > 2000 || minutesNum > 120000) {
    return null; // Unrealistic values
  }

  // Convert to total minutes
  // 1 week = 5 days * 8 hours = 40 hours = 2400 minutes
  // 1 day = 8 hours = 480 minutes
  // 1 hour = 60 minutes
  const totalMinutes = weeksNum * 2400 + daysNum * 480 + hoursNum * 60 + minutesNum;

  return totalMinutes;
}

/**
 * Format total minutes back to human-readable time string
 * Converts to largest units possible (weeks → days → hours → minutes)
 *
 * @param minutes - Total minutes
 * @returns Formatted string (e.g., "1w 2d 3h 30m") or "0m" if zero
 */
export function formatTimeFromMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) {
    return '0m';
  }

  if (minutes === 0) {
    return '0m';
  }

  let remaining = minutes;
  const parts: string[] = [];

  // Calculate weeks (1 week = 2400 minutes)
  const weeks = Math.floor(remaining / 2400);
  if (weeks > 0) {
    parts.push(`${weeks}w`);
    remaining %= 2400;
  }

  // Calculate days (1 day = 480 minutes)
  const days = Math.floor(remaining / 480);
  if (days > 0) {
    parts.push(`${days}d`);
    remaining %= 480;
  }

  // Calculate hours (1 hour = 60 minutes)
  const hours = Math.floor(remaining / 60);
  if (hours > 0) {
    parts.push(`${hours}h`);
    remaining %= 60;
  }

  // Remaining minutes
  if (remaining > 0) {
    parts.push(`${remaining}m`);
  }

  return parts.join(' ');
}

/**
 * Validate time string format
 * @param timeString - Time string to validate
 * @returns true if valid format, false otherwise
 */
export function isValidTimeFormat(timeString: string): boolean {
  return parseTimeToMinutes(timeString) !== null;
}

/**
 * Calculate time remaining based on original estimate and time spent
 * @param originalEstimate - Original time estimate in minutes
 * @param timeSpent - Time already spent in minutes
 * @returns Remaining time in minutes (can be negative if over budget)
 */
export function calculateTimeRemaining(originalEstimate: number, timeSpent: number): number {
  return Math.max(0, originalEstimate - timeSpent);
}

/**
 * Parse time string with validation and error message
 * @param timeString - Time string to parse
 * @returns Object with minutes or error message
 */
export function parseTimeWithValidation(timeString: string): {
  success: boolean;
  minutes?: number;
  error?: string;
} {
  if (!timeString || timeString.trim() === '') {
    return {
      success: false,
      error: 'Time string cannot be empty',
    };
  }

  const minutes = parseTimeToMinutes(timeString);

  if (minutes === null) {
    return {
      success: false,
      error: 'Invalid time format. Use format like "1w 2d 3h 30m" (weeks, days, hours, minutes)',
    };
  }

  if (minutes === 0) {
    return {
      success: false,
      error: 'Time spent must be greater than 0',
    };
  }

  if (minutes > 120000) {
    // ~2000 hours or ~250 days
    return {
      success: false,
      error: 'Time value is too large. Maximum is approximately 2000 hours.',
    };
  }

  return {
    success: true,
    minutes,
  };
}
