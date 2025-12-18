'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Search, Trash2 } from 'lucide-react';
import { useAdvancedFilter } from '@/hooks/useAdvancedFilter';
import {
  FILTER_FIELDS,
  OPERATOR_LABELS,
  getAvailableOperators,
  operatorRequiresValue,
  operatorRequiresArray,
  operatorRequiresDateRange,
  formatConditionForDisplay,
  type AdvancedFilterCondition,
  type FilterOperator,
} from '@/types/advancedFilter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AdvancedFilterBuilderProps {
  onSearch?: () => void; // Callback when search is executed
  compact?: boolean; // Compact mode for inline display
}

export function AdvancedFilterBuilder({ onSearch, compact = false }: AdvancedFilterBuilderProps) {
  const {
    conditions,
    logicalOperator,
    addCondition,
    removeCondition,
    setLogicalOperator,
    clearFilters,
    executeSearch,
    isSearching,
    canSearch,
    getConditionError,
  } = useAdvancedFilter();

  // New condition builder state
  const [newField, setNewField] = useState<string>('');
  const [newOperator, setNewOperator] = useState<FilterOperator | ''>('');
  const [newValue, setNewValue] = useState<string>('');
  const [newEnumValue, setNewEnumValue] = useState<string>('');
  const [newEnumValues, setNewEnumValues] = useState<string[]>([]);
  const [newDateValue, setNewDateValue] = useState<Date | undefined>(undefined);
  const [newDateRangeStart, setNewDateRangeStart] = useState<Date | undefined>(undefined);
  const [newDateRangeEnd, setNewDateRangeEnd] = useState<Date | undefined>(undefined);

  // Get current field configuration
  const currentFieldConfig = newField ? FILTER_FIELDS[newField] : null;
  const fieldType = currentFieldConfig?.type;

  // Reset form function
  const resetForm = () => {
    setNewField('');
    setNewOperator('');
    setNewValue('');
    setNewEnumValue('');
    setNewEnumValues([]);
    setNewDateValue(undefined);
    setNewDateRangeStart(undefined);
    setNewDateRangeEnd(undefined);
  };

  const handleAddCondition = () => {
    if (!newField || !newOperator) return;

    const condition: AdvancedFilterCondition = {
      field: newField,
      operator: newOperator as FilterOperator,
    };

    // Handle different value types based on field type and operator
    if (operatorRequiresValue(newOperator as FilterOperator)) {
      if (fieldType === 'enum') {
        if (operatorRequiresArray(newOperator as FilterOperator)) {
          condition.value = newEnumValues;
        } else {
          condition.value = newEnumValue;
        }
      } else if (fieldType === 'date') {
        if (operatorRequiresDateRange(newOperator as FilterOperator)) {
          if (newDateRangeStart && newDateRangeEnd) {
            condition.value = [newDateRangeStart, newDateRangeEnd];
          }
        } else {
          condition.value = newDateValue;
        }
      } else {
        // String, UUID, Number types
        if (operatorRequiresArray(newOperator as FilterOperator)) {
          condition.value = newValue
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);
        } else {
          condition.value = newValue;
        }
      }
    }

    addCondition(condition);
    resetForm();
  };

  const handleSearch = async () => {
    await executeSearch();
    if (onSearch) {
      onSearch(); // Trigger parent callback to refetch tasks
    }
  };

  // Render value input based on field type and operator
  const renderValueInput = () => {
    if (!newOperator || !operatorRequiresValue(newOperator as FilterOperator)) {
      return null;
    }

    // Enum fields (Status, Priority)
    if (fieldType === 'enum' && currentFieldConfig?.enumValues) {
      const isMultiple = operatorRequiresArray(newOperator as FilterOperator);

      if (isMultiple) {
        // Multiple select for 'in' and 'notIn'
        return (
          <div className="space-y-2">
            <Select
              value="" // Always reset to empty after selection
              onValueChange={value => {
                if (!newEnumValues.includes(value)) {
                  setNewEnumValues([...newEnumValues, value]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select values" />
              </SelectTrigger>
              <SelectContent>
                {currentFieldConfig.enumValues.map(enumVal => (
                  <SelectItem key={enumVal} value={enumVal}>
                    {enumVal.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Selected values */}
            {newEnumValues.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {newEnumValues.map(val => (
                  <Badge key={val} variant="secondary" className="text-xs">
                    {val.replace(/_/g, ' ')}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer"
                      onClick={() => setNewEnumValues(newEnumValues.filter(v => v !== val))}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );
      } else {
        // Single select for 'eq'
        return (
          <Select value={newEnumValue} onValueChange={setNewEnumValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {currentFieldConfig.enumValues.map(enumVal => (
                <SelectItem key={enumVal} value={enumVal}>
                  {enumVal.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
    }

    // Date fields
    if (fieldType === 'date') {
      if (operatorRequiresDateRange(newOperator as FilterOperator)) {
        // Date range picker
        return (
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'justify-start text-left font-normal',
                    !newDateRangeStart && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDateRangeStart ? format(newDateRangeStart, 'PPP') : 'Start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDateRangeStart}
                  onSelect={setNewDateRangeStart}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'justify-start text-left font-normal',
                    !newDateRangeEnd && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDateRangeEnd ? format(newDateRangeEnd, 'PPP') : 'End date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDateRangeEnd}
                  onSelect={setNewDateRangeEnd}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );
      } else {
        // Single date picker
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal',
                  !newDateValue && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {newDateValue ? format(newDateValue, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={newDateValue}
                onSelect={setNewDateValue}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );
      }
    }

    // String, UUID, Number fields
    return (
      <Input
        placeholder={
          operatorRequiresArray(newOperator as FilterOperator)
            ? 'Enter values (comma-separated)'
            : 'Enter value'
        }
        value={newValue}
        onChange={e => setNewValue(e.target.value)}
      />
    );
  };

  // Check if add button should be enabled
  const canAddCondition = () => {
    if (!newField || !newOperator) return false;

    if (!operatorRequiresValue(newOperator as FilterOperator)) {
      return true; // isNull and isNotNull don't need values
    }

    if (fieldType === 'enum') {
      if (operatorRequiresArray(newOperator as FilterOperator)) {
        return newEnumValues.length > 0;
      }
      return !!newEnumValue;
    }

    if (fieldType === 'date') {
      if (operatorRequiresDateRange(newOperator as FilterOperator)) {
        return !!newDateRangeStart && !!newDateRangeEnd;
      }
      return !!newDateValue;
    }

    return !!newValue;
  };

  if (compact) {
    // Compact inline view for TaskSuperVisorList
    return (
      <Card className="w-full">
        <CardContent className="pt-6 space-y-4">
          {/* Existing Conditions */}
          {conditions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Filters ({conditions.length}/15)</h4>
                <div className="flex items-center gap-2">
                  <Select
                    value={logicalOperator}
                    onValueChange={v => setLogicalOperator(v as 'AND' | 'OR')}
                  >
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {conditions.map((condition, index) => {
                  const error = getConditionError(index);
                  return (
                    <Badge
                      key={index}
                      variant={error ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {index === 0 ? 'WHERE' : logicalOperator}{' '}
                      {formatConditionForDisplay(condition)}
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => removeCondition(index)}
                      />
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* New Condition Builder - Horizontal Layout */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              {/* Field Selection */}
              <Select
                value={newField}
                onValueChange={value => {
                  setNewField(value);
                  setNewOperator('');
                  // Don't call resetForm here, just reset operator
                  setNewValue('');
                  setNewEnumValue('');
                  setNewEnumValues([]);
                  setNewDateValue(undefined);
                  setNewDateRangeStart(undefined);
                  setNewDateRangeEnd(undefined);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FILTER_FIELDS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Operator Selection */}
              <Select
                value={newOperator}
                onValueChange={v => {
                  setNewOperator(v as FilterOperator);
                  setNewValue('');
                  setNewEnumValue('');
                  setNewEnumValues([]);
                  setNewDateValue(undefined);
                  setNewDateRangeStart(undefined);
                  setNewDateRangeEnd(undefined);
                }}
                disabled={!newField}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                  {newField &&
                    getAvailableOperators(newField).map(op => (
                      <SelectItem key={op} value={op}>
                        {OPERATOR_LABELS[op]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* Value Input */}
              <div className="md:col-span-2">{newField && newOperator && renderValueInput()}</div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleAddCondition}
                disabled={!canAddCondition()}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>

              <Button onClick={handleSearch} disabled={!canSearch || isSearching} size="sm">
                <Search className="h-4 w-4 mr-1" />
                {isSearching ? 'Searching...' : 'Apply Filters'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full card view (for modal if needed later)
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Advanced Filters</CardTitle>
        <CardDescription>Build complex queries with up to 15 filter conditions</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ... rest of the original full view code ... */}
      </CardContent>
    </Card>
  );
}
