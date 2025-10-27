"use client"

import * as React from "react"
import {
  Bar,
  BarChart as BarChartPrimitive,
  CartesianGrid,
  Label,
  LabelList,
  Line,
  LineChart as LineChartPrimitive,
  Pie,
  PieChart as PieChartPrimitive,
  PolarGrid,
  RadialBar,
  RadialBarChart as RadialBarChartPrimitive,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useTheme } from "next-themes"

const ChartLegend: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div>{children}</div>
)

const ChartLegendContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div>{children}</div>
)

// Minimal local type and component stubs to avoid circular imports and
// provide the pieces used by the rest of the app. These are intentionally
// small — replace them with your full implementations when available.
type ChartConfig = Record<string, any>
type ChartStyle = Record<string, any>

const ChartContainer: React.FC<{
  data?: any[]
  config?: ChartConfig
  className?: string
  children?: React.ReactNode
}> = ({ children, className }) => {
  return <div className={className}>{children}</div>
}

const ChartTooltip: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div>{children}</div>
)

const ChartTooltipContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div>{children}</div>
)
import { cn } from "@/lib/utils"

const Chart = ChartContainer

const ChartWrapper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: ChartConfig
    data: any[]
    chartType:
      | "bar"
      | "line"
      | "pie"
      | "radial"
      | "area"
      | "radar"
    children: React.ReactNode
  }
>(({ config, data, chartType, children, ...props }, ref) => {
  const { theme } = useTheme()
  const [activeChart, setActiveChart] = React.useState(
    Object.keys(config)[0] as keyof typeof config
  )

  const ChartComponent =
    chartType === "bar"
      ? BarChart
      : chartType === "line"
      ? LineChart
      : chartType === "pie"
      ? PieChart
      : RadialChart

  return (
    <div ref={ref} {...props}>
      <Chart
        data={data}
        config={config}
        className="mx-auto aspect-square max-h-[250px]"
      >
        {children}
      </Chart>
    </div>
  )
})
ChartWrapper.displayName = "ChartWrapper"

const BarChart = BarChartPrimitive
const LineChart = LineChartPrimitive

const PieChart = React.forwardRef<
  React.ComponentRef<typeof PieChartPrimitive>,
  React.ComponentProps<typeof PieChartPrimitive>
>(({ children, ...props }, ref) => (
  <PieChartPrimitive {...props}>{children}</PieChartPrimitive>
))
PieChart.displayName = "PieChart"

const RadialChart = React.forwardRef<
  React.ComponentRef<typeof RadialBarChartPrimitive>,
  React.ComponentProps<typeof RadialBarChartPrimitive>
>(({ children, ...props }, ref) => (
  <RadialBarChartPrimitive {...props}>{children}</RadialBarChartPrimitive>
))
RadialChart.displayName = "RadialChart"

export {
  Chart,
  ChartWrapper,
  BarChart,
  LineChart,
  PieChart,
  RadialChart,
  CartesianGrid,
  XAxis,
  YAxis,
  RechartsTooltip,
  ChartLegend,
  ChartLegendContent,
  Bar,
  Line,
  Pie,
  RadialBar,
  Label,
  LabelList,
  PolarGrid,
  ChartTooltip,
  ChartTooltipContent,
}

export type { ChartConfig, ChartStyle }
