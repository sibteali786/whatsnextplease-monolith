/*
 * @jest-environment node
 */
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
import { AllDurationFilter, DurationFilter } from "../FilterDuration";

describe("DurationFilter", () => {
  // Fixed current date: October 1, 2023, at 12:00 PM UTC
  const MOCK_DATE = new Date("2023-10-01T12:00:00Z"); // October 1st, 2023

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_DATE);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("DurationFilter TODAY returns correct start and end dates", () => {
    const durationFilter = new DurationFilter(
      DurationEnum.TODAY,
      () => startOfToday(),
      () => addDays(startOfToday(), 1),
    );

    const expectedStartDate = new Date(2023, 9, 1, 0, 0, 0, 0);
    const expectedEndDate = new Date(2023, 9, 2, 0, 0, 0, 0);

    expect(durationFilter.getStartDate()).toEqual(expectedStartDate);
    expect(durationFilter.getEndDate()).toEqual(expectedEndDate);
    expect(durationFilter.getDateFilter()).toEqual({
      dueDate: {
        gte: expectedStartDate,
        lt: expectedEndDate,
      },
    });
  });

  test("DurationFilter THIS_WEEK returns correct start and end dates", () => {
    const durationFilter = new DurationFilter(
      DurationEnum.THIS_WEEK,
      () => startOfWeek(MOCK_DATE),
      () => addWeeks(startOfWeek(MOCK_DATE), 1),
    );

    const expectedStartDate = new Date(2023, 8, 31, 0, 0, 0, 0);
    const expectedEndDate = new Date(2023, 9, 8, 0, 0, 0, 0);
    expect(durationFilter.getStartDate()).toEqual(expectedStartDate);
    expect(durationFilter.getEndDate()).toEqual(expectedEndDate);
    expect(durationFilter.getDateFilter()).toEqual({
      dueDate: {
        gte: expectedStartDate,
        lt: expectedEndDate,
      },
    });
  });

  test("DurationFilter THIS_MONTH returns correct start and end dates", () => {
    const durationFilter = new DurationFilter(
      DurationEnum.THIS_MONTH,
      () => startOfMonth(MOCK_DATE),
      () => addMonths(startOfMonth(MOCK_DATE), 1),
    );

    const expectedStartDate = new Date(2023, 9, 1, 0, 0, 0, 0);
    const expectedEndDate = new Date(2023, 10, 1, 0, 0, 0, 0);

    expect(durationFilter.getStartDate()).toEqual(expectedStartDate);
    expect(durationFilter.getEndDate()).toEqual(expectedEndDate);
    expect(durationFilter.getDateFilter()).toEqual({
      dueDate: {
        gte: expectedStartDate,
        lt: expectedEndDate,
      },
    });
  });

  test("DurationFilter THIS_YEAR returns correct start and end dates", () => {
    const durationFilter = new DurationFilter(
      DurationEnum.THIS_YEAR,
      () => startOfYear(MOCK_DATE),
      () => addYears(startOfYear(MOCK_DATE), 1),
    );

    const expectedStartDate = new Date(2023, 0, 1, 0, 0, 0, 0);
    const expectedEndDate = new Date(2024, 0, 1, 0, 0, 0, 0);

    expect(durationFilter.getStartDate()).toEqual(expectedStartDate);
    expect(durationFilter.getEndDate()).toEqual(expectedEndDate);
    expect(durationFilter.getDateFilter()).toEqual({
      dueDate: {
        gte: expectedStartDate,
        lt: expectedEndDate,
      },
    });
  });

  test("AllDurationFilter returns empty filter", () => {
    const durationFilter = new AllDurationFilter();

    expect(durationFilter.getDateFilter()).toEqual({});
  });

  // TODO: Add leap years, Daylight savings, End of Month calculations etc as well
});
