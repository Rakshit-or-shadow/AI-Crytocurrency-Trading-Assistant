import React, { useEffect, useState } from "react";
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { API_URL } from "./config";
import WhyPanel from "./WhyPanel";
import type { AITrade, AIDecision } from "./WhyPanel";
import "./styles/Extras.css";

// What the backend sends from /ai-trading-history
interface AIHistory {
  running: boolean;
  trading_pair?: string;
  balance?: number;
  total_value?: number;
  sentiment_score?: number;
  rl_model_loaded?: boolean;
  price_history: { time: string; price: number }[];
  trades: AITrade[];
  last_decision: AIDecision | null;
}

// One point on the chart: the price, plus a marker value if the AI traded at that moment
interface ChartPoint {
  time: string;
  price: number;
  buy?: number;
  sell?: number;
}

interface Props {
  crypto: string; // coin name from the URL, for example "Bitcoin"
}

const AITradingGraph: React.FC<Props> = ({ crypto }) => {
  const [history, setHistory] = useState<AIHistory | null>(null);
  const [message, setMessage] = useState("");
  const [selectedTrade, setSelectedTrade] = useState<AITrade | null>(null);

  // Ask the backend for the latest AI data every 4 seconds
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_URL}/ai-trading-history`);
        setHistory(await response.json());
      } catch (error) {
        console.error("Error fetching AI trading history:", error);
      }
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 4000);
    return () => clearInterval(interval);
  }, []);

  const startAI = async () => {
    try {
      const response = await fetch(`${API_URL}/ai/start/${crypto}`, { method: "POST" });
      const result = await response.json();
      setMessage(result.message);
    } catch {
      setMessage("Could not reach the backend.");
    }
  };

  const stopAI = async () => {
    try {
      const response = await fetch(`${API_URL}/ai/stop`, { method: "POST" });
      const result = await response.json();
      setMessage(result.message);
    } catch {
      setMessage("Could not reach the backend.");
    }
  };

  // Build the chart data: copy each price point and add a buy/sell marker where a trade happened
  const chartData: ChartPoint[] = (history?.price_history ?? []).map((point) => {
    const chartPoint: ChartPoint = { time: point.time, price: point.price };
    for (const trade of history?.trades ?? []) {
      if (trade.time === point.time) {
        if (trade.action === "buy") chartPoint.buy = point.price;
        if (trade.action === "sell") chartPoint.sell = point.price;
      }
    }
    return chartPoint;
  });

  // Show only the time of day on the x axis ("2025-02-16T10:30:05" -> "10:30:05")
  const formatTime = (value: string) => value.split("T")[1] ?? value;

  return (
    <div className="ai-trading-graph">
      <h2>AI Trading History</h2>
      <p className="paper-label">Paper trading - simulated money</p>

      <div className="ai-controls">
        <button onClick={startAI} disabled={history?.running}>Start AI trader</button>
        <button onClick={stopAI} disabled={!history?.running}>Stop</button>
        <span>{history?.running ? "Running" : "Stopped"}</span>
      </div>
      {message && <p className="status-message">{message}</p>}

      {history && history.rl_model_loaded === false && history.running && (
        <p className="notice">
          No trained RL model found, so the AI only holds. Run <code>python backtest.py</code> in
          the backend folder to train one.
        </p>
      )}

      {chartData.length === 0 ? (
        <p>No data yet. Start the AI trader and wait a few seconds for prices to arrive.</p>
      ) : (
        <ComposedChart width={900} height={400} data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="gray" />
          <XAxis dataKey="time" tickFormatter={formatTime} tick={{ fontSize: 12, fill: "white" }} stroke="white" />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(value) => value.toFixed(2)}
            tick={{ fontSize: 12, fill: "white" }}
            stroke="white"
          />
          <Tooltip
            labelFormatter={formatTime}
            formatter={(value) => (typeof value === "number" ? value.toFixed(2) : value)}
            contentStyle={{ backgroundColor: "white", borderColor: "white" }}
          />
          <Legend />
          <Line type="monotone" dataKey="price" name="Price" stroke="#45ba8b" strokeWidth={2} dot={false} />
          <Scatter dataKey="buy" name="AI buy" fill="#2ecc71" shape="triangle" />
          <Scatter dataKey="sell" name="AI sell" fill="#e74c3c" shape="diamond" />
        </ComposedChart>
      )}

      <WhyPanel
        trades={history?.trades ?? []}
        lastDecision={history?.last_decision ?? null}
        selectedTrade={selectedTrade}
        onSelectTrade={setSelectedTrade}
      />
    </div>
  );
};

export default AITradingGraph;
