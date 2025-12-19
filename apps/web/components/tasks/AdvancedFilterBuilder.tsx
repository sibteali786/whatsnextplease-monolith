'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { X, Plus, Search, Trash2, UserX, Check } from 'lucide-react';
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
import { useAdvancedFilterContext } from '@/contexts/AdvancedFilterContext';
import { SearchableDropdown } from '../ui/searchable-dropdown';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { usersList } from '@/db/repositories/users/usersList';
import { Roles } from '@prisma/client';
import { useLoggedInUserState } from '@/store/useUserStore';
import { useLoggedInClientState } from '@/store/useClientStore';

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
    updateCondition,
  } = useAdvancedFilterContext();

  // New condition builder state
  const [newField, setNewField] = useState<string>('');
  const [newOperator, setNewOperator] = useState<FilterOperator | ''>('');
  const [newValue, setNewValue] = useState<string>('');
  const [newEnumValue, setNewEnumValue] = useState<string>('');
  const [newEnumValues, setNewEnumValues] = useState<string[]>([]);
  const [newDateValue, setNewDateValue] = useState<Date | undefined>(undefined);
  const [newDateRangeStart, setNewDateRangeStart] = useState<Date | undefined>(undefined);
  const [newDateRangeEnd, setNewDateRangeEnd] = useState<Date | undefined>(undefined);

  const [users, setUsers] = useState<
    {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      currentTasksCount?: number;
    }[]
  >([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const hasFetchedInitialUsers = useRef(false);
  const { user } = useLoggedInUserState();
  const { client } = useLoggedInClientState();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const loadConditionForEdit = (index: number) => {
    const condition = conditions[index];
    if (!condition) return;

    // Set field and operator
    setNewField(condition.field);
    setNewOperator(condition.operator);

    const fieldConfig = FILTER_FIELDS[condition.field];
    const fieldType = fieldConfig?.type;

    // load the value based on field type
    if (condition.value !== undefined) {
      if (fieldType === 'enum') {
        if (Array.isArray(condition.value)) {
          setNewEnumValues(condition.value as string[]);
        } else {
          setNewEnumValue(condition.value as string);
        }
      } else if (fieldType === 'date') {
        if (Array.isArray(condition.value)) {
          const [start, end] = condition.value;
          setNewDateRangeStart(start instanceof Date ? start : new Date(start));
          setNewDateRangeEnd(end instanceof Date ? end : new Date(end));
        } else {
          setNewDateValue(
            condition.value instanceof Date
              ? condition.value
              : condition.value
                ? new Date(condition.value)
                : undefined
          );
        }
      } else if (fieldType === 'user-search') {
        setNewValue(condition.value as string);
      } else {
        // String, UUID, Number
        if (Array.isArray(condition.value)) {
          setNewValue((condition.value as string[]).join(', '));
        } else {
          setNewValue(condition.value as string);
        }
      }
    }

    setEditingIndex(index);
    setIsEditMode(true);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setIsEditMode(false);
    resetForm();
  };
  const fetchUsers = useCallback(
    async (pageToFetch: number, query?: string, opts?: { isInitial?: boolean }) => {
      if (loadingUsers) return;
      if (!hasMoreUsers && pageToFetch > 1) return;
      if (opts?.isInitial && hasFetchedInitialUsers.current) return;

      if (opts?.isInitial) hasFetchedInitialUsers.current = true;

      setLoadingUsers(true);
      try {
        const response = await usersList(
          user?.role?.name ?? client?.role?.name ?? Roles.TASK_SUPERVISOR,
          [],
          5, //limit
          pageToFetch ?? userPage,
          query
        );

        if (response.success) {
          if (pageToFetch === 1) {
            setUsers(response.users);
            setUserPage(2);
          } else {
            setUsers(prev => [...prev, ...response.users]);
            setUserPage(prev => prev + 1);
          }

          setHasMoreUsers(response.hasMore || false);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoadingUsers(false);
      }
    },
    [loadingUsers, hasMoreUsers, userPage, user, client]
  );

  // Initial fetch
  useEffect(() => {
    fetchUsers(1, '', { isInitial: true });
  }, []);

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

    // Update existing condition if in edit mode

    if (isEditMode && editingIndex !== null) {
      updateCondition(editingIndex, condition);
      setIsEditMode(false);
      setEditingIndex(null);
    } else {
      addCondition(condition);
    }
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
    if (fieldType === 'user-search') {
      return (
        <SearchableDropdown<{
          value: string;
          label: string;
          avatarUrl: string | null;
          firstName: string;
          lastName: string;
          currentTasksCount?: number;
        }>
          items={[
            {
              value: 'null',
              label: 'No Assignee',
              avatarUrl: null,
              firstName: '',
              lastName: '',
              currentTasksCount: undefined,
            },
            ...users.map(user => ({
              value: user.id,
              label: `${user.firstName} ${user.lastName}`,
              avatarUrl: user.avatarUrl,
              firstName: user.firstName,
              lastName: user.lastName,
              currentTasksCount: user.currentTasksCount,
            })),
          ]}
          value={newValue}
          onChange={setNewValue}
          searchQuery={userSearchQuery}
          placeholder="Search by name..."
          searchPlaceholder="Search users..."
          noResultsText="No users found"
          noSelectionValue="null"
          noSelectionContent={
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">No Assignee</span>
            </div>
          }
          onScrollEnd={() => {
            if (hasMoreUsers && !loadingUsers) {
              fetchUsers(userPage, userSearchQuery);
            }
          }}
          onSearch={query => {
            setUserSearchQuery(query);
            fetchUsers(1, query);
          }}
          renderOption={user =>
            user.value === 'null' ? (
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">No Assignee</span>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 rounded-lg">
                    <AvatarImage
                      src={user.avatarUrl || 'https://github.com/shadcn.png'}
                      alt={user.firstName}
                      className="rounded-full"
                    />
                    <AvatarFallback className="rounded-full text-xs">
                      {user.firstName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
                {user.currentTasksCount !== undefined && (
                  <Badge
                    variant={user.currentTasksCount > 8 ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {user.currentTasksCount}
                  </Badge>
                )}
              </div>
            )
          }
        />
      );
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
                  const isBeingEdited = isEditMode && editingIndex === index;

                  return (
                    <Badge
                      key={index}
                      variant={error ? 'destructive' : isBeingEdited ? 'default' : 'secondary'}
                      className={cn(
                        'text-xs cursor-pointer transition-all',
                        isBeingEdited && 'ring-2 ring-primary ring-offset-2'
                      )}
                      onClick={() => {
                        if (!isBeingEdited) {
                          loadConditionForEdit(index);
                        }
                      }}
                    >
                      {index === 0 ? 'WHERE' : logicalOperator}{' '}
                      {formatConditionForDisplay(condition)}
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive"
                        onClick={e => {
                          e.stopPropagation(); // Prevent triggering edit mode
                          removeCondition(index);
                          if (isBeingEdited) {
                            cancelEdit();
                          }
                        }}
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
              {isEditMode ? (
                <>
                  <Button
                    onClick={handleAddCondition}
                    disabled={!canAddCondition()}
                    variant="default"
                    size="sm"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Update
                  </Button>
                  <Button onClick={cancelEdit} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleAddCondition}
                  disabled={!canAddCondition()}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}

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
        {/* Existing Conditions */}
        {conditions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Active Filters ({conditions.length}/15)</h4>
              <div className="flex items-center gap-2">
                <Select
                  value={logicalOperator}
                  onValueChange={v => setLogicalOperator(v as 'AND' | 'OR')}
                >
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              {conditions.map((condition, index) => {
                const error = getConditionError(index);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {index === 0 ? 'WHERE' : logicalOperator}
                      </span>
                      <Badge variant={error ? 'destructive' : 'secondary'}>
                        {formatConditionForDisplay(condition)}
                      </Badge>
                      {error && <span className="text-xs text-destructive">{error}</span>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeCondition(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* New Condition Builder */}
        <div className="space-y-3 border-t pt-4">
          <h4 className="text-sm font-medium">Add Filter Condition</h4>

          <div className="space-y-2">
            {/* Field Selection */}
            <Select
              value={newField}
              onValueChange={value => {
                setNewField(value);
                setNewOperator('');
                resetForm();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
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
            {newField && (
              <Select
                value={newOperator}
                onValueChange={v => {
                  setNewOperator(v as FilterOperator);
                  // Reset value inputs when operator changes
                  setNewValue('');
                  setNewEnumValue('');
                  setNewEnumValues([]);
                  setNewDateValue(undefined);
                  setNewDateRangeStart(undefined);
                  setNewDateRangeEnd(undefined);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableOperators(newField).map(op => (
                    <SelectItem key={op} value={op}>
                      {OPERATOR_LABELS[op]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Value Input */}
            {newField && newOperator && renderValueInput()}
          </div>

          <Button
            onClick={handleAddCondition}
            disabled={!canAddCondition()}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Condition
          </Button>
        </div>

        {/* Search Button */}
        <Button onClick={executeSearch} disabled={!canSearch || isSearching} className="w-full">
          <Search className="h-4 w-4 mr-2" />
          {isSearching
            ? 'Searching...'
            : `Search (${conditions.length} filter${conditions.length !== 1 ? 's' : ''})`}
        </Button>
      </CardContent>
    </Card>
  );
}
