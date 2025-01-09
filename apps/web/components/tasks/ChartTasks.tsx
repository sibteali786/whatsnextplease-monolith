"use client";

import * as React from "react";
import { Label, Pie, PieChart, Sector } from "recharts";
import { PieSectorDataItem } from "recharts/types/polar/Pie";

import {
  ChartConfig,
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const desktopData = [
  { month: "january", desktop: 31, fill: "var(--color-january)" },
  { month: "february", desktop: 50, fill: "var(--color-february)" },
  { month: "march", desktop: 12, fill: "var(--color-march)" },
  { month: "april", desktop: 90, fill: "var(--color-april)" },
  { month: "may", desktop: 6, fill: "var(--color-may)" },
];

const chartConfig = {
  january: {
    label: "January",
    color: "hsl(var(--chart-1))",
  },
  february: {
    label: "February",
    color: "hsl(var(--chart-2))",
  },
  march: {
    label: "March",
    color: "hsl(var(--chart-3))",
  },
  april: {
    label: "April",
    color: "hsl(var(--chart-4))",
  },
  may: {
    label: "May",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

export function TaskAgentChart() {
  const id = "pie-simple";
  const [activeMonth, setActiveMonth] = React.useState(desktopData[0]?.month);

  const activeIndex = React.useMemo(
    () => desktopData.findIndex((item) => item.month === activeMonth),
    [activeMonth],
  );
  const months = React.useMemo(() => desktopData.map((item) => item.month), []);
  //   TODO: Make an api which gets tasks by each month sp that it can plotted in the chart
  return (
    <div
      data-chart={id}
      className="flex flex-col items-center space-y-4 p-4 w-full"
    >
      <ChartStyle id={id} config={chartConfig} />
      <Select value={activeMonth} onValueChange={setActiveMonth}>
        <SelectTrigger
          className="h-9 w-[150px] rounded-lg border border-muted-foreground"
          aria-label="Select a month"
        >
          <SelectValue placeholder="Select month" />
        </SelectTrigger>
        <SelectContent align="center" className="rounded-xl">
          {months.map((key) => {
            const config = chartConfig[key as keyof typeof chartConfig];

            if (!config) {
              return null;
            }

            return (
              <SelectItem
                key={key}
                value={key}
                className="rounded-lg [&_span]:flex"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="flex h-3 w-3 shrink-0 rounded-sm"
                    style={{
                      backgroundColor: `var(--color-${key})`,
                    }}
                  />
                  {config?.label}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <div className="flex flex-1 justify-center w-full">
        <ChartContainer
          id={id}
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={desktopData}
              dataKey="desktop"
              nameKey="month"
              innerRadius={60}
              strokeWidth={5}
              activeIndex={activeIndex}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius + 25}
                    innerRadius={outerRadius + 12}
                  />
                </g>
              )}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {desktopData[activeIndex]?.desktop.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Tasks
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>
    </div>
  );
}
