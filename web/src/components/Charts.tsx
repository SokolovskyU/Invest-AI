import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { PieChart, BarChart } from "echarts/charts";
import { TooltipComponent, GridComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([PieChart, BarChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer]);

type PiePoint = {
  label: string;
  value: number;
  valueText: string;
  percentText: string;
};

type IncomePoint = {
  month: string;
  value: number;
  amount: string;
};

type ChartsProps = {
  assetPie: PiePoint[];
  incomeNext12: IncomePoint[];
};

export function Charts({ assetPie, incomeNext12 }: ChartsProps) {
  const pieOption = {
    tooltip: {
      trigger: "item",
      backgroundColor: "#1f2740",
      borderColor: "#44527a",
      textStyle: { color: "#e8efff" },
      formatter: (params: any) => {
        const item = params?.data as PiePoint;
        return `${item?.label || ""}<br/>${item?.valueText || ""} (${item?.percentText || ""})`;
      },
    },
    series: [
      {
        type: "pie",
        radius: ["42%", "70%"],
        avoidLabelOverlap: true,
        label: { color: "#d5def5" },
        itemStyle: {
          borderColor: "#222a3f",
          borderWidth: 2,
        },
        data: assetPie.map((item) => ({
          ...item,
          name: item.label,
          value: item.value,
        })),
      },
    ],
  };

  const incomeOption = {
    tooltip: {
      trigger: "axis",
      backgroundColor: "#1f2740",
      borderColor: "#44527a",
      textStyle: { color: "#e8efff" },
    },
    grid: { left: 34, right: 10, top: 24, bottom: 36 },
    xAxis: {
      type: "category",
      data: incomeNext12.map((item) => item.month),
      axisLabel: { color: "#c2cde9", fontSize: 11 },
      axisLine: { lineStyle: { color: "#455171" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#c2cde9", fontSize: 11 },
      splitLine: { lineStyle: { color: "#36415f" } },
    },
    series: [
      {
        type: "bar",
        data: incomeNext12.map((item) => item.value),
        barWidth: 16,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: "#2bb7ff",
        },
      },
    ],
  };

  return (
    <section className="charts-grid">
      <article className="card">
        <h2>Asset Structure (ECharts)</h2>
        {assetPie.length ? (
          <ReactEChartsCore
            echarts={echarts}
            option={pieOption}
            style={{ height: 320 }}
            opts={{ renderer: "canvas" }}
          />
        ) : (
          <p>No data for pie chart.</p>
        )}
      </article>

      <article className="card">
        <h2>12-Month Income (ECharts)</h2>
        {incomeNext12.length ? (
          <ReactEChartsCore
            echarts={echarts}
            option={incomeOption}
            style={{ height: 320 }}
            opts={{ renderer: "canvas" }}
          />
        ) : (
          <p>No data for income chart.</p>
        )}
      </article>
    </section>
  );
}

export default Charts;
