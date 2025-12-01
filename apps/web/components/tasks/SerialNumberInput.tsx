'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';
import { debounce } from 'lodash';
import { serialNumberAPI } from '@/utils/tasks/serialNumberAPI';

interface SerialNumberInputProps {
  categoryId: string;
  categoryName: string;
  value?: string;
  onChange: (prefix: string | undefined) => void;
  disabled?: boolean;
}

export function SerialNumberPrefixInput({
  categoryId,
  categoryName,
  value,
  onChange,
  disabled,
}: SerialNumberInputProps) {
  const [suggestedPrefix, setSuggestedPrefix] = useState<string>('');
  const [customPrefix, setCustomPrefix] = useState<string>(value || '');
  const [uniquenessStatus, setUniquenessStatus] = useState<
    'idle' | 'checking' | 'unique' | 'duplicate' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  useEffect(() => {
    if (!categoryId) return;
    const fetchSuggestedPrefix = async () => {
      try {
        const response = await serialNumberAPI.getSuggestedPrefixForCategory(categoryId);
        if (response.success && response.data) {
          setSuggestedPrefix(response.data.prefix);

          // If user hasnt set a custom prefix, use the suggested one
          if (!customPrefix) {
            setCustomPrefix(response.data.prefix);
            onChange(undefined);
          }
        }
      } catch (error) {
        console.error('Failed to fetch  prefix suggestion:', error);
        setErrorMessage('Failed to load prefix sugestion.');
      }
    };
    fetchSuggestedPrefix();
  }, [categoryId]);

  // Debouced uniqueness check
  const checkUniqueness = useCallback(
    debounce(async (prefix: string) => {
      if (!prefix || prefix === suggestedPrefix) {
        setUniquenessStatus('idle');
        return;
      }
      setUniquenessStatus('checking');

      try {
        const response = await serialNumberAPI.checkPrefixUniqueness(prefix);
        if (response.success && response.data) {
          setUniquenessStatus(response.data.isUnique ? 'unique' : 'duplicate');
        }
      } catch (error) {
        console.error('Failed to check uniqeness:', error);
        setUniquenessStatus('error');
        setErrorMessage('Failed to check prefix uniqueness.');
        setUniquenessStatus('error');
        setErrorMessage('Failed to check prefix uniqueness.');
      }
    }, 500),
    [suggestedPrefix]
  );
  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrefix = e.target.value.toUpperCase().trim();

    // validate format: 1-5 alphanumeric characters
    if (newPrefix && !/^[A-Z0-9]{1,5}/.test(newPrefix)) {
      return; // Don't update if invalid format
    }

    setCustomPrefix(newPrefix);
    setErrorMessage('');

    // if it matches suggested prefix, clear custom override
    if (newPrefix === suggestedPrefix) {
      onChange(undefined);
      setUniquenessStatus('idle');
    } else {
      onChange(newPrefix);
      checkUniqueness(newPrefix);
    }
  };

  const renderStatusIndicator = () => {
    if (!customPrefix || customPrefix === suggestedPrefix) {
      return null;
    }

    switch (uniquenessStatus) {
      case 'checking':
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking availability</span>
          </div>
        );
      case 'unique':
        return (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>Prefix available</span>
          </div>
        );

      case 'duplicate':
        return (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Prefix &quot;{customPrefix}&quot; is already in use by another category. Consider
              using a different prefix or add a number suffix (e.g., {customPrefix}1).
            </AlertDescription>
          </Alert>
        );

      case 'error':
        return (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        );

      default:
        break;
    }
  };
  return (
    <div className="space-y-2">
      <Label htmlFor="serial-prefix" className="flex items-center gap-2">
        Task Serial Number Prefix
        {suggestedPrefix && customPrefix === suggestedPrefix && (
          <Badge variant="outline" className="text-xs">
            Suggested
          </Badge>
        )}
      </Label>

      <div className="flex items-center gap-2">
        <Input
          id="serial-prefix"
          value={customPrefix}
          onChange={handlePrefixChange}
          placeholder="e.g., WD, DC"
          maxLength={5}
          disabled={disabled}
          className="w-32 uppercase font-mono"
        />
        <span className="text-muted-foreground">-</span>
        <Input
          value="00001"
          disabled
          readOnly
          className="w-32 font-mono bg-muted"
          title="Number will be auto-generated when task is created"
        />
      </div>

      {renderStatusIndicator()}

      <Alert className="mt-2">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          The serial number will be automatically assigned when you save the task with a title. The
          number part is sequential and cannot be edited.
          {suggestedPrefix && (
            <>
              <br />
              Suggested prefix for &quot;{categoryName}&quot;: <strong>{suggestedPrefix}</strong>
            </>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
