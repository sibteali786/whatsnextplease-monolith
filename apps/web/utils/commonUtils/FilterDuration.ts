import { DurationEnum } from "@/types";

export class DurationFilter {
  name: DurationEnum;
  private getStartDateFunc: () => Date;
  private getEndDateFunc: () => Date;

  constructor(
    name: DurationEnum,
    getStartDateFunc: () => Date,
    getEndDateFunc: () => Date,
  ) {
    this.name = name;
    this.getStartDateFunc = getStartDateFunc;
    this.getEndDateFunc = getEndDateFunc;
  }

  getStartDate(): Date {
    return this.getStartDateFunc();
  }

  getEndDate(): Date {
    return this.getEndDateFunc();
  }

  getDateFilter(): GetDateFilter {
    if (this.name === DurationEnum.ALL) {
      return {};
    } else {
      return {
        dueDate: {
          gte: this.getStartDate(),
          lt: this.getEndDate(),
        },
      };
    }
  }
}

export class AllDurationFilter extends DurationFilter {
  constructor() {
    super(
      DurationEnum.ALL,
      () => new Date(),
      () => new Date(),
    ); // Dummy dates
  }

  getDateFilter(): object {
    return {}; // Override to return an empty filter
  }
}
type GetDateFilter =
  | {
      dueDate: {
        gte: Date;
        lt: Date;
      };
    }
  | object;
