'use client';

import { forwardRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Info } from 'lucide-react';
import { parseTimeToMinutes, formatTimeFromMinutes } from '@/utils/time/timeUtils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TimeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  showFormatHint?: boolean;
  onValueChange?: (value: string) => void;
}

/**
 * TimeInput component compatible with React Hook Form
 * Uses forwardRef to work with Controller/register
 */
const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  (
    {
      label,
      error,
      showFormatHint = true,
      required = false,
      placeholder = 'e.g., 2h 30m',
      disabled = false,
      className,
      value,
      onChange,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [preview, setPreview] = useState<string>('');
    const [touched, setTouched] = useState(false);

    // Update preview when value changes
    useEffect(() => {
      if (value && typeof value === 'string' && value.trim()) {
        const minutes = parseTimeToMinutes(value);
        if (minutes !== null && minutes > 0) {
          setPreview(formatTimeFromMinutes(minutes, true));
        } else {
          setPreview('');
        }
      } else {
        setPreview('');
      }
    }, [value]);

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      if (onBlur) {
        onBlur(e);
      }
    };

    const showError = touched && error;

    return (
      <div className="space-y-2">
        {/* Label with Info Icon */}
        <div className="flex items-center gap-2">
          <Label htmlFor={label} className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {showFormatHint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="text-xs space-y-1">
                  <p className="font-semibold">Use the format: 2w 4d 6h 45m</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>w = weeks</li>
                    <li>d = days</li>
                    <li>h = hours</li>
                    <li>m = minutes</li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Input Field */}
        <Input
          id={label}
          ref={ref}
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            showError && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          {...props}
        />

        {/* Preview (verbose format) */}
        {preview && !showError && <p className="text-xs text-muted-foreground">{preview}</p>}

        {/* Error message */}
        {showError && (
          <div className="flex items-start gap-1.5 text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-xs">{error}</p>
          </div>
        )}

        {/* Format hint (only show when no error and no preview) */}
        {showFormatHint && !showError && !preview && (
          <p className="text-xs text-muted-foreground">Use the format: 2w 4d 6h 45m</p>
        )}
      </div>
    );
  }
);

TimeInput.displayName = 'TimeInput';

export default TimeInput;
