export const getPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 6) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[\W_]/.test(password)) strength++;

  return strength; // A score from 0 to 5
};

export function getRandomLightColorClass() {
  const colors = [
    'bg-red-200',
    'bg-green-200',
    'bg-blue-200',
    'bg-yellow-200',
    'bg-purple-200',
    'bg-pink-200',
    'bg-indigo-200',
    'bg-teal-200',
    'bg-orange-200',
    'bg-gray-200',
    'bg-red-300',
    'bg-green-300',
    'bg-blue-300',
    'bg-yellow-300',
    'bg-purple-300',
    'bg-pink-300',
    'bg-indigo-300',
    'bg-teal-300',
    'bg-orange-300',
    'bg-gray-300',
  ];

  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
}

export const capitalizeFirstChar = (word: string) => {
  if (!word) return ''; // Handle empty strings
  return word.charAt(0).toUpperCase() + word.slice(1);
};
export const transformEnumValue = (value: string): string => {
  if (!value) return '';
  return value
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const formatNumbers = (number: string): string => {
  const castedNumber = Number(number);

  if (isNaN(castedNumber)) {
    return 'Invalid number';
  }

  // Ensure the number is formatted with two decimal places
  const formattedNumber = castedNumber.toFixed(2);

  // Add leading "0" if the integer part of the number is less than 10
  if (castedNumber < 10) {
    return `0${formattedNumber}`;
  }

  return formattedNumber;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trimWhitespace = <T extends Record<string, any>>(obj: T): T => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      // Handle strings - trim whitespace
      if (typeof value === 'string') {
        return [key, value.trim()];
      }
      // Handle Date objects - return as-is (BEFORE checking for object)
      else if (value instanceof Date) {
        return [key, value];
      }
      // Handle arrays - return as-is
      else if (Array.isArray(value)) {
        return [key, value];
      }
      // Handle other special objects - return as-is
      else if (value instanceof RegExp || value instanceof File || value instanceof Blob) {
        return [key, value];
      }
      // Handle plain objects - process recursively
      else if (value !== null && typeof value === 'object') {
        return [key, trimWhitespace(value)];
      }
      // Handle primitives (number, boolean, null, undefined) - return as-is
      else {
        return [key, value];
      }
    })
  ) as T;
};

function parseOriginalEstimate(value: string): number | null {
  // Pattern matches optional groups of w, d, h, m
  // Examples:
  // "2w 1d 5h 4m", "4d", "5h 30m", "60m", "3w"
  const regex = /^\s*(?:(\d+)w)?\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*$/i;
  const match = value.trim().match(regex);
  if (!match) return null;

  const [, w, d, h, m] = match;

  // If all are undefined, it means no valid time unit was provided
  if (!w && !d && !h && !m) return null;

  const weeks = w ? parseInt(w, 10) : 0;
  const days = d ? parseInt(d, 10) : 0;
  const hours = h ? parseInt(h, 10) : 0;
  const minutes = m ? parseInt(m, 10) : 0;

  // Conversion
  // 1w = 7d * 8h = 56h
  // 1d = 8h
  const totalHours = weeks * 56 + days * 8 + hours + minutes / 60;
  return totalHours;
}

function formatOriginalEstimate(hours: number): string {
  // Convert decimal hours back to w, d, h, m
  let remaining = hours;
  const weeks = Math.floor(remaining / 56);
  remaining %= 56;
  const days = Math.floor(remaining / 8);
  remaining %= 8;
  const wholeHours = Math.floor(remaining);
  const minutes = Math.round((remaining - wholeHours) * 60);

  const parts: string[] = [];
  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0) parts.push(`${days}d`);
  if (wholeHours > 0) parts.push(`${wholeHours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  console.log('Decimal Value', hours, 'Converted Value', parts.join(' '));

  return parts.join(' ') || '0h';
}
export const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
};

export { parseOriginalEstimate, formatOriginalEstimate };
