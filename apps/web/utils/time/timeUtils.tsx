/**
 * Frontend Time Utilities for Work Log Feature
 * Mirrors backend parsing/formatting logic
 */

/**
 * Parse human-readable time string to total minutes
 * Examples: "2w 1d 5h 30m", "4d", "5h 30m", "60m"
 */

export function parseTimeToMinutes(timeString: string): number | null {
  if (!timeString || typeof timeString !== 'string') {
    return null;
  }

  const regex = /^\s*(?:(\d+)w)?\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*$/i;
  const match = timeString.trim().match(regex);

  if (!match) {
    return null;
  }

  const [, weeks, days, hours, minutes] = match;

  if (!weeks && !days && !hours && !minutes) {
    return null;
  }

  const weeksNum = weeks ? parseInt(weeks, 10) : 0;
  const daysNum = days ? parseInt(days, 10) : 0;
  const hoursNum = hours ? parseInt(hours, 10) : 0;
  const minutesNum = minutes ? parseInt(minutes, 10) : 0;

  // Validate ranges
  if (weeksNum > 520 || daysNum > 365 || hoursNum > 2000 || minutesNum > 120000) {
    return null;
  }

  // 1w = 2400min, 1d = 480min, 1h = 60min
  const totalMinutes = weeksNum * 2400 + daysNum * 480 + hoursNum * 60 + minutesNum;
  return totalMinutes;
}

/**
 * Format minutes to human-readable time string
 */
export function formatTimeFromMinutes(minutes: number, verbose = false): string {
  if (!Number.isFinite(minutes) || minutes < 0) {
    return verbose ? '0 minutes' : '0m';
  }

  if (minutes === 0) {
    return verbose ? '0 minutes' : '0m';
  }

  let remaining = minutes;
  const parts: string[] = [];

  // Weeks
  const weeks = Math.floor(remaining / 2400);
  if (weeks > 0) {
    parts.push(verbose ? `${weeks} week${weeks > 1 ? 's' : ''}` : `${weeks}w`);
    remaining %= 2400;
  }

  // Days
  const days = Math.floor(remaining / 480);
  if (days > 0) {
    parts.push(verbose ? `${days} day${days > 1 ? 's' : ''}` : `${days}d`);
    remaining %= 480;
  }

  // Hours
  const hours = Math.floor(remaining / 60);
  if (hours > 0) {
    parts.push(verbose ? `${hours} hour${hours > 1 ? 's' : ''}` : `${hours}h`);
    remaining %= 60;
  }

  // Minutes
  if (remaining > 0) {
    parts.push(verbose ? `${remaining} minute${remaining > 1 ? 's' : ''}` : `${remaining}m`);
  }

  return parts.join(verbose ? ', ' : ' ');
}

/**
 * Validate time string format
 */
export function validateTimeFormat(timeString: string): {
  isValid: boolean;
  error?: string;
} {
  if (!timeString || timeString.trim() === '') {
    return {
      isValid: false,
      error: 'Time cannot be empty',
    };
  }

  const minutes = parseTimeToMinutes(timeString);

  if (minutes === null) {
    return {
      isValid: false,
      error: 'Invalid format. Use: 2w 4d 6h 45m',
    };
  }

  if (minutes === 0) {
    return {
      isValid: false,
      error: 'Time must be greater than 0',
    };
  }

  if (minutes > 120000) {
    return {
      isValid: false,
      error: 'Time value is too large',
    };
  }

  return { isValid: true };
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(timeSpent: number, timeRemaining: number): number {
  const total = timeSpent + timeRemaining;
  if (total === 0) return 0;
  return Math.round((timeSpent / total) * 100);
}

/**
 * Format progress text
 */
export function formatProgressText(
  timeSpent: number,
  timeRemaining: number,
  verbose = false
): string {
  return `${formatTimeFromMinutes(timeSpent, verbose)} logged, ${formatTimeFromMinutes(timeRemaining, verbose)} remaining`;
}
