import * as React from "react"

export const ChartLegend: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <div className="chart-legend">{children}</div>
}

export const ChartLegendContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <div className="chart-legend-content">{children}</div>
}

export default ChartLegend
