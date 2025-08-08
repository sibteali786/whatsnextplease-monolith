'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Users, Settings, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UserWithRole {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  avatarUrl?: string;
  roleId?: string;
  role?: {
    id: string;
    name: string;
    description?: string;
  };
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

// Maximum length for role description before truncation
const ROLE_DESCRIPTION_MAX_LENGTH = 24;

// Role color mapping for better UX
const getRoleColor = (roleName: string) => {
  const colorMap: Record<string, string> = {
    SUPER_USER: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    DISTRICT_MANAGER: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    TERRITORY_MANAGER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    ACCOUNT_EXECUTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    TASK_SUPERVISOR: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    TASK_AGENT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    CLIENT: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };
  return colorMap[roleName] || 'bg-gray-100 text-gray-800';
};

// Format role name for display
const formatRoleName = (roleName: string) => {
  return roleName
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
};

export default function PermissionsClient() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Trigger search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm.trim()) return;
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchUsersWithRoles(1, pagination.limit, debouncedSearchTerm, roleFilter);
  }, [debouncedSearchTerm, roleFilter]);

  // Fetch users with roles
  const fetchUsersWithRoles = useCallback(
    async (
      page = pagination.page,
      limit = pagination.limit,
      search = debouncedSearchTerm,
      role = roleFilter
    ) => {
      setTableLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(search && { search }),
          ...(role && { role }),
        });
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/user/permissions/roles?${params}`,
          {
            headers: {
              Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const result = await response.json();
        if (result.success) {
          setUsers(result.data);
          setPagination(result.pagination);
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: `Failed to load users: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: 'destructive',
        });
      } finally {
        setTableLoading(false);
      }
    },
    [toast, pagination.page, pagination.limit, debouncedSearchTerm, roleFilter]
  );

  // Manual refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchUsersWithRoles(pagination.page, pagination.limit, debouncedSearchTerm, roleFilter);
      toast({
        title: 'Success',
        description: 'User data refreshed successfully',
      });
    } catch (error) {
      // Error already handled in fetchUsersWithRoles
      console.log('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };
  const fetchAvailableRoles = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/available-roles`, {
        headers: {
          Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const result = await response.json();
      if (result.success) {
        setAvailableRoles(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to load available roles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Update user role
  const updateUserRole = async (userId: string, newRoleId: string) => {
    setUpdatingUserId(userId);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
        },
        body: JSON.stringify({ roleId: newRoleId }),
      });

      const result = await response.json();

      if (result.success) {
        // Update the specific user in local state with fresh data from server
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === userId ? { ...user, roleId: newRoleId, role: result.data.role } : user
          )
        );

        toast({
          title: 'Success',
          description: 'User role updated successfully',
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update role',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      // Remove setLoading(true/false)
      await Promise.all([fetchUsersWithRoles(), fetchAvailableRoles()]);
    };
    initializeData();
  }, [fetchUsersWithRoles, fetchAvailableRoles]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        {tableLoading ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Users className="h-3 w-3" />
            <span>{users.length} users</span>
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || updatingUserId !== null || tableLoading}
        >
          {refreshing ? 'Refreshing...' : 'Refresh All'}
        </Button>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Role Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Manage user roles and permissions. CLIENT roles cannot be modified through this
            interface. Changes are logged for audit purposes.
          </p>
        </CardContent>
      </Card>
      {/* Search and Filter Bar */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search users by name, username, or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_ROLES">All Roles</SelectItem>
            {availableRoles.map(role => (
              <SelectItem key={role.id} value={role.name}>
                {formatRoleName(role.name)}
              </SelectItem>
            ))}
            <SelectItem value="CLIENT">Client</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Change Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableLoading || refreshing
                ? // Show skeleton rows during refresh
                  Array.from({ length: users.length || 3 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-9 w-[180px]" />
                      </TableCell>
                    </TableRow>
                  ))
                : users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatarUrl} alt={user.username} />
                            <AvatarFallback>
                              {user.firstName.charAt(0)}
                              {user.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">@{user.username}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm">{user.email}</span>
                      </TableCell>

                      <TableCell>
                        <Badge className={getRoleColor(user.role?.name || '')} variant="secondary">
                          {formatRoleName(user.role?.name || 'No Role')}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {user.role?.name === 'CLIENT' ? (
                          <Badge variant="outline" className="text-xs">
                            Cannot Change
                          </Badge>
                        ) : (
                          <Select
                            value={user.roleId || ''}
                            onValueChange={newRoleId => updateUserRole(user.id, newRoleId)}
                            disabled={updatingUserId === user.id}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRoles.map(role => (
                                <SelectItem key={role.id} value={role.id}>
                                  <div className="flex flex-col items-start">
                                    <span>{formatRoleName(role.name)}</span>
                                    {role.description && (
                                      <span className="text-xs text-muted-foreground text-left">
                                        {role.description.length > ROLE_DESCRIPTION_MAX_LENGTH
                                          ? `${role.description.slice(0, ROLE_DESCRIPTION_MAX_LENGTH)}...`
                                          : role.description}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
            {pagination.totalCount} users
          </span>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm">Rows per page:</span>
            <Select
              value={pagination.limit.toString()}
              onValueChange={value => {
                setPagination(prev => ({ ...prev, limit: parseInt(value), page: 1 }));
                fetchUsersWithRoles(1, parseInt(value));
              }}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newPage = pagination.page - 1;
                setPagination(prev => ({ ...prev, page: newPage }));
                fetchUsersWithRoles(newPage, pagination.limit, debouncedSearchTerm, roleFilter);
              }}
              disabled={!pagination.hasPreviousPage}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newPage = pagination.page + 1;
                setPagination(prev => ({ ...prev, page: newPage }));
                fetchUsersWithRoles(newPage, pagination.limit, debouncedSearchTerm, roleFilter);
              }}
              disabled={!pagination.hasNextPage}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
