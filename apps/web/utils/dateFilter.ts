// durations.ts

import { DurationEnum } from "@/types";
import {
  startOfToday,
  addDays,
  startOfWeek,
  addWeeks,
  startOfMonth,
  addMonths,
  startOfYear,
  addYears,
} from "date-fns";
import {
  AllDurationFilter,
  DurationFilter,
} from "./commonUtils/FilterDuration";

const now = new Date();
const startOfTodayDate = startOfToday();
const startOfWeekDate = startOfWeek(now);
const startOfMonthDate = startOfMonth(now);
const startOfYearDate = startOfYear(now);

export const durationFilters = {
  [DurationEnum.TODAY]: new DurationFilter(
    DurationEnum.TODAY,
    () => startOfTodayDate,
    () => addDays(startOfTodayDate, 1),
  ),
  [DurationEnum.THIS_WEEK]: new DurationFilter(
    DurationEnum.THIS_WEEK,
    () => startOfWeekDate,
    () => addWeeks(startOfWeekDate, 1),
  ),
  [DurationEnum.THIS_MONTH]: new DurationFilter(
    DurationEnum.THIS_MONTH,
    () => startOfMonthDate,
    () => addMonths(startOfMonthDate, 1),
  ),
  [DurationEnum.THIS_YEAR]: new DurationFilter(
    DurationEnum.THIS_YEAR,
    () => startOfYearDate,
    () => addYears(startOfYearDate, 1),
  ),
  [DurationEnum.ALL]: new AllDurationFilter(),
};

export const getDateFilter = (duration: DurationEnum) => {
  const durationFilter = durationFilters[duration];
  if (!durationFilter) {
    throw new Error(`Invalid duration: ${duration}`);
  }
  return durationFilter.getDateFilter();
};
