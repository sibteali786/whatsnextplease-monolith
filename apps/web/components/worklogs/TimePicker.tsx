'use client';

import { forwardRef, useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
}

const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(
  ({ value, onChange, onBlur, disabled = false }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [hours, setHours] = useState('12');
    const [minutes, setMinutes] = useState('00');
    const [period, setPeriod] = useState<'AM' | 'PM'>('PM');

    // Parse initial value
    useEffect(() => {
      if (value) {
        const [h, m] = value.split(':');
        const hour = parseInt(h ?? '0', 10);
        const isPM = hour >= 12;

        setHours(
          String(isPM ? (hour === 12 ? 12 : hour - 12) : hour === 0 ? 12 : hour).padStart(2, '0')
        );
        setMinutes(m ?? '00');
        setPeriod(isPM ? 'PM' : 'AM');
      }
    }, [value]);

    const handleApply = () => {
      let hour24 = parseInt(hours, 10);

      if (period === 'AM' && hour24 === 12) {
        hour24 = 0;
      } else if (period === 'PM' && hour24 !== 12) {
        hour24 += 12;
      }

      const formattedTime = `${String(hour24).padStart(2, '0')}:${minutes}`;
      onChange(formattedTime);
      setIsOpen(false);
      if (onBlur) onBlur();
    };

    const formatDisplayTime = () => {
      if (!value) return 'Select time';
      const [h, m] = value.split(':');
      const hour = parseInt(h ?? '0', 10);
      const isPM = hour >= 12;
      const hour12 = isPM ? (hour === 12 ? 12 : hour - 12) : hour === 0 ? 12 : hour;
      return `${String(hour12).padStart(2, '0')}:${m} ${isPM ? 'PM' : 'AM'}`;
    };

    return (
      <>
        <input ref={ref} type="hidden" value={value} onChange={e => onChange(e.target.value)} />
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                'w-[140px] justify-start text-left font-normal',
                !value && 'text-muted-foreground'
              )}
            >
              <Clock className="mr-2 h-4 w-4" />
              {formatDisplayTime()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-4">
              <div className="text-sm font-medium">Select Time</div>

              <div className="flex items-center gap-2">
                {/* Hours */}
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground mb-1">Hour</label>
                  <select
                    value={hours}
                    onChange={e => setHours(e.target.value)}
                    className="w-16 px-2 py-1 border rounded-md text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                      <option key={h} value={String(h).padStart(2, '0')}>
                        {String(h).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xl font-bold mt-5">:</div>

                {/* Minutes */}
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground mb-1">Minute</label>
                  <select
                    value={minutes}
                    onChange={e => setMinutes(e.target.value)}
                    className="w-16 px-2 py-1 border rounded-md text-sm"
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map(m => (
                      <option key={m} value={String(m).padStart(2, '0')}>
                        {String(m).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* AM/PM */}
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground mb-1">Period</label>
                  <select
                    value={period}
                    onChange={e => setPeriod(e.target.value as 'AM' | 'PM')}
                    className="w-16 px-2 py-1 border rounded-md text-sm"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleApply}>
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </>
    );
  }
);

TimePicker.displayName = 'TimePicker';

export default TimePicker;
