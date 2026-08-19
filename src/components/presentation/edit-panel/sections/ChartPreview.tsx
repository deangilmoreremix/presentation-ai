"use client";

import { type ReactNode } from "react";

import {
  AREA_CHART_ELEMENT,
  BAR_CHART_ELEMENT,
  BOX_PLOT_CHART_ELEMENT,
  BUBBLE_CHART_ELEMENT,
  CANDLESTICK_CHART_ELEMENT,
  CHORD_CHART_ELEMENT,
  COMPOSED_CHART_ELEMENT,
  CONE_FUNNEL_CHART_ELEMENT,
  DONUT_CHART_ELEMENT,
  FUNNEL_CHART_ELEMENT,
  HEATMAP_CHART_ELEMENT,
  HISTOGRAM_CHART_ELEMENT,
  LINE_CHART_ELEMENT,
  LINEAR_GAUGE_ELEMENT,
  NIGHTINGALE_CHART_ELEMENT,
  OHLC_CHART_ELEMENT,
  PIE_CHART_ELEMENT,
  PYRAMID_CHART_ELEMENT,
  RADAR_CHART_ELEMENT,
  RADIAL_BAR_CHART_ELEMENT,
  RADIAL_COLUMN_CHART_ELEMENT,
  RADIAL_GAUGE_ELEMENT,
  RANGE_AREA_CHART_ELEMENT,
  RANGE_BAR_CHART_ELEMENT,
  SANKEY_CHART_ELEMENT,
  SCATTER_CHART_ELEMENT,
  SUNBURST_CHART_ELEMENT,
  TREEMAP_CHART_ELEMENT,
  WATERFALL_CHART_ELEMENT,
} from "@/components/presentation/editor/lib";
import LazyPreview from "@/components/notebook/presentation/utils/LazyPreview";
import { cn } from "@/lib/utils";

const CHART_PREVIEWS: Record<string, ReactNode> = {
  [AREA_CHART_ELEMENT]: <LazyPreview name="AreaChartPreview" />,
  [BAR_CHART_ELEMENT]: <LazyPreview name="BarChartPreview" />,
  [BOX_PLOT_CHART_ELEMENT]: <LazyPreview name="BoxPlotChartPreview" />,
  [BUBBLE_CHART_ELEMENT]: <LazyPreview name="BubbleChartPreview" />,
  [CANDLESTICK_CHART_ELEMENT]: <LazyPreview name="CandlestickChartPreview" />,
  [CHORD_CHART_ELEMENT]: <LazyPreview name="ChordChartPreview" />,
  [COMPOSED_CHART_ELEMENT]: <LazyPreview name="CombinationChartPreview" />,
  [CONE_FUNNEL_CHART_ELEMENT]: <LazyPreview name="ConeFunnelChartPreview" />,
  [DONUT_CHART_ELEMENT]: <LazyPreview name="DonutChartPreview" />,
  [FUNNEL_CHART_ELEMENT]: <LazyPreview name="FunnelChartPreview" />,
  [HEATMAP_CHART_ELEMENT]: <LazyPreview name="HeatmapChartPreview" />,
  [HISTOGRAM_CHART_ELEMENT]: <LazyPreview name="HistogramChartPreview" />,
  [LINE_CHART_ELEMENT]: <LazyPreview name="LineChartPreview" />,
  [LINEAR_GAUGE_ELEMENT]: <LazyPreview name="LinearGaugeChartPreview" />,
  [NIGHTINGALE_CHART_ELEMENT]: <LazyPreview name="NightingaleChartPreview" />,
  [OHLC_CHART_ELEMENT]: <LazyPreview name="OHLCChartPreview" />,
  [PIE_CHART_ELEMENT]: <LazyPreview name="PieChartPreview" />,
  [PYRAMID_CHART_ELEMENT]: <LazyPreview name="PyramidChartPreview2" />,
  [RADAR_CHART_ELEMENT]: <LazyPreview name="RadarLineChartPreview" />,
  [RADIAL_BAR_CHART_ELEMENT]: <LazyPreview name="RadialBarChartPreview" />,
  [RADIAL_COLUMN_CHART_ELEMENT]: <LazyPreview name="RadialColumnChartPreview" />,
  [RADIAL_GAUGE_ELEMENT]: <LazyPreview name="RadialGaugeChartPreview" />,
  [RANGE_AREA_CHART_ELEMENT]: <LazyPreview name="RangeAreaChartPreview" />,
  [RANGE_BAR_CHART_ELEMENT]: <LazyPreview name="RangeBarChartPreview" />,
  [SANKEY_CHART_ELEMENT]: <LazyPreview name="SankeyChartPreview" />,
  [SCATTER_CHART_ELEMENT]: <LazyPreview name="ScatterChartPreview" />,
  [SUNBURST_CHART_ELEMENT]: <LazyPreview name="SunburstChartPreview" />,
  [TREEMAP_CHART_ELEMENT]: <LazyPreview name="TreemapChartPreview" />,
  [WATERFALL_CHART_ELEMENT]: <LazyPreview name="WaterfallChartPreview" />,
};

interface ChartPreviewProps {
  chartType: string;
  className?: string;
}

export function ChartPreview({ chartType, className }: ChartPreviewProps) {
  const preview = CHART_PREVIEWS[chartType] ?? (
    <LazyPreview name="BarChartPreview" />
  );

  return (
    <div
      className={cn(
        "pointer-events-none aspect-4/3 w-full overflow-hidden rounded-sm border bg-card select-none **:pointer-events-none **:select-none",
        className,
      )}
    >
      {preview}
    </div>
  );
}
