import { Skill, TaskPriorityEnum, TaskStatusEnum } from "@prisma/client";

export interface SkillCategory {
  id: string;
  categoryName: string;
  skillsDescription: string;
}
export interface TasksTypeLocal {
  id: string;
  priority: {
    priorityName: TaskPriorityEnum;
  };
  status: {
    statusName: TaskStatusEnum;
  };
  taskCategory: {
    categoryName: string;
  };
  dueDate: Date | null;
  description: string;
  createdByClientId: string | null;
  createdByUserId: string | null;
  createdByUser: {
    firstName: string;
    lastName: string;
  } | null;
  createdByClient: {
    contactName: string | null;
    companyName: string;
  } | null;
  title: string;
}

export interface TaskModified {
  id: string;
  priority: TaskPriorityEnum;
  status: string;
  category: string;
  dueDate: string;
  description: string;
  createdBy: string;
  title: string;
}

export type TaskModifiedArray = TaskModified[] | [];

export enum TaskPriority {
  Urgent = "Urgent",
  Normal = "Normal",
  Low = "Low",
}

export enum ActiveTaskStatusEnum {
  NEW = "NEW",
  OVERDUE = "OVERDUE",
  IN_PROGRESS = "IN_PROGRESS",
}

export interface ClientType {
  id: string;
  companyName: string;
  contactName: string;
  activeTaskCount: number;
}
export type SkillType = Skill | undefined;

export enum DurationEnum {
  TODAY = "TODAY",
  THIS_WEEK = "THIS_WEEK",
  THIS_MONTH = "THIS_MONTH",
  THIS_YEAR = "THIS_YEAR",
  ALL = "ALL",
}

export type DurationEnumList = {
  label: DurationEnum;
  value: string;
}[];
