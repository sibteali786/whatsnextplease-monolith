"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Sample data for active clients trend over the months
const chartData = [
  { month: "Mar", activeClients: 30 },
  { month: "Apr", activeClients: 32 },
  { month: "May", activeClients: 34 },
  { month: "Jun", activeClients: 37 },
  { month: "Jul", activeClients: 39 },
  { month: "Aug", activeClients: 42 },
  { month: "Sep", activeClients: 45 },
  { month: "Oct", activeClients: 50 },
  { month: "Nov", activeClients: 55 },
  { month: "Dec", activeClients: 60 },
];

// Chart configuration for color styling
const chartConfig = {
  activeClients: {
    label: "Active Clients",
    color: "hsl(var(--chart-6))",
  },
} satisfies ChartConfig;

export function ActiveClientsChart() {
  return (
    <>
      <ChartContainer config={chartConfig} className="min-h-[160px] w-full">
        <AreaChart
          data={chartData}
          margin={{
            left: -20,
            right: 12,
          }}
        >
          <defs>
            <linearGradient
              id="activeClientsGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#7F56D9" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#7F56D9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickCount={3}
            allowDecimals={false}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Area
            dataKey="activeClients"
            type="monotone"
            fill="url(#activeClientsGradient)" // Reference the gradient here
            stroke="var(--color-activeClients)"
            stackId="a"
          />
        </AreaChart>
      </ChartContainer>
    </>
  );
}
