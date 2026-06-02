"use client";

import ReactECharts from "echarts-for-react";

export function EchartsBar({
  labels,
  values,
  name,
}: {
  labels: string[];
  values: number[];
  name: string;
}) {
  return (
    <ReactECharts
      style={{ height: 280, width: "100%" }}
      option={{
        grid: { top: 24, right: 16, bottom: 32, left: 56 },
        tooltip: { trigger: "axis" },
        xAxis: { type: "category", data: labels, axisLabel: { color: "#78716c" } },
        yAxis: { type: "value", axisLabel: { color: "#78716c" } },
        series: [{ name, type: "bar", data: values, itemStyle: { color: "#047857", borderRadius: [4, 4, 0, 0] } }],
      }}
    />
  );
}
