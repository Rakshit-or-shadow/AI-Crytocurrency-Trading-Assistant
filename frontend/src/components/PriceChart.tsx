import React from "react";
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { CHART } from "../lib/chartColors";

export interface PricePoint {
  time: string;
  price: number;
  buy?: number;
  sell?: number;
}

interface Props {
  data: PricePoint[];
  label: string; // accessible description of what the chart shows
  yDomain?: [number | string, number | string];
  formatTime?: (value: string) => string;
  markers?: boolean;
}

interface TipProps {
  active?: boolean;
  payload?: { payload: PricePoint }[];
  label?: string;
  formatTime: (value: string) => string;
}

const Tip: React.FC<TipProps> = ({ active, payload, label, formatTime }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="muted">{formatTime(label ?? point.time)}</div>
      <div><b>${point.price.toFixed(2)}</b></div>
      {point.buy !== undefined && <div className="amber">AI bought here</div>}
      {point.sell !== undefined && <div className="amber">AI sold here</div>}
    </div>
  );
};

// Responsive price line with optional AI trade markers
const PriceChart: React.FC<Props> = ({ data, label, yDomain, formatTime = (v) => v, markers = false }) => (
  <div className="chart-box" role="img" aria-label={label}>
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="time"
          tickFormatter={formatTime}
          tick={{ fontSize: 13, fill: CHART.axis }}
          stroke={CHART.grid}
          minTickGap={48}
        />
        <YAxis
          domain={yDomain ?? ["auto", "auto"]}
          tickFormatter={(value: number) => (value >= 1000 ? Math.round(value).toLocaleString("en-US") : value.toFixed(2))}
          tick={{ fontSize: 13, fill: CHART.axis }}
          stroke={CHART.grid}
          width={80}
        />
        <Tooltip content={<Tip formatTime={formatTime} />} cursor={{ stroke: CHART.axis }} />
        <Line
          type="monotone"
          dataKey="price"
          stroke={CHART.signal}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        {markers && (
          <Scatter dataKey="buy" name="AI buy" fill={CHART.amber} shape="triangle" isAnimationActive={false} />
        )}
        {markers && (
          <Scatter
            dataKey="sell"
            name="AI sell"
            fill={CHART.amber}
            stroke={CHART.ink}
            shape="diamond"
            isAnimationActive={false}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  </div>
);

export default PriceChart;
