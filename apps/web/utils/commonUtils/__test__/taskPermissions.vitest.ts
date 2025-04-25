import { describe, it, expect } from 'vitest';
import { Roles } from '@prisma/client';
import {
  canViewTasks,
  canCreateTasks,
  canBeAssignedTasks,
  getTaskFilterCondition,
} from '../taskPermissions';

describe('Task Permission Utilities', () => {
  describe('canViewTasks', () => {
    it('should allow permitted roles to view tasks', () => {
      expect(canViewTasks(Roles.TASK_AGENT)).toBe(true);
      expect(canViewTasks(Roles.TASK_SUPERVISOR)).toBe(true);
      expect(canViewTasks(Roles.CLIENT)).toBe(true);
      expect(canViewTasks(Roles.SUPER_USER)).toBe(true);
    });

    it('should deny non-permitted roles from viewing tasks', () => {
      expect(canViewTasks(Roles.ACCOUNT_EXECUTIVE)).toBe(false);
      expect(canViewTasks(Roles.DISTRICT_MANAGER)).toBe(false);
      expect(canViewTasks(Roles.TERRITORY_MANAGER)).toBe(false);
    });
  });

  describe('canCreateTasks', () => {
    it('should allow permitted roles to create tasks', () => {
      expect(canCreateTasks(Roles.CLIENT)).toBe(true);
      expect(canCreateTasks(Roles.TASK_SUPERVISOR)).toBe(true);
      expect(canCreateTasks(Roles.SUPER_USER)).toBe(true);
    });

    it('should deny non-permitted roles from creating tasks', () => {
      expect(canCreateTasks(Roles.TASK_AGENT)).toBe(false);
      expect(canCreateTasks(Roles.ACCOUNT_EXECUTIVE)).toBe(false);
      expect(canCreateTasks(Roles.DISTRICT_MANAGER)).toBe(false);
      expect(canCreateTasks(Roles.TERRITORY_MANAGER)).toBe(false);
    });
  });

  describe('canBeAssignedTasks', () => {
    it('should allow permitted roles to be assigned tasks', () => {
      expect(canBeAssignedTasks(Roles.TASK_AGENT)).toBe(true);
      expect(canBeAssignedTasks(Roles.TASK_SUPERVISOR)).toBe(true);
    });

    it('should deny non-permitted roles from being assigned tasks', () => {
      expect(canBeAssignedTasks(Roles.CLIENT)).toBe(false);
      expect(canBeAssignedTasks(Roles.SUPER_USER)).toBe(false);
      expect(canBeAssignedTasks(Roles.ACCOUNT_EXECUTIVE)).toBe(false);
      expect(canBeAssignedTasks(Roles.DISTRICT_MANAGER)).toBe(false);
      expect(canBeAssignedTasks(Roles.TERRITORY_MANAGER)).toBe(false);
    });
  });

  describe('getTaskFilterCondition', () => {
    const TEST_USER_ID = 'test-user-id';

    it('should return assignedToId filter for TASK_AGENT', () => {
      const filter = getTaskFilterCondition(TEST_USER_ID, Roles.TASK_AGENT);
      expect(filter).toEqual({ assignedToId: TEST_USER_ID });
    });

    it('should return assignedToId filter for TASK_SUPERVISOR', () => {
      const filter = getTaskFilterCondition(TEST_USER_ID, Roles.TASK_SUPERVISOR);
      expect(filter).toEqual({ assignedToId: TEST_USER_ID });
    });

    it('should return createdByClientId filter for CLIENT', () => {
      const filter = getTaskFilterCondition(TEST_USER_ID, Roles.CLIENT);
      expect(filter).toEqual({ createdByClientId: TEST_USER_ID });
    });

    it('should return OR filter for SUPER_USER', () => {
      const filter = getTaskFilterCondition(TEST_USER_ID, Roles.SUPER_USER);
      expect(filter).toEqual({
        OR: [{ assignedToId: TEST_USER_ID }, { createdByUserId: TEST_USER_ID }],
      });
    });

    it('should return empty object for unsupported roles', () => {
      const filter = getTaskFilterCondition(TEST_USER_ID, Roles.ACCOUNT_EXECUTIVE);
      expect(filter).toEqual({});
    });
  });
});
