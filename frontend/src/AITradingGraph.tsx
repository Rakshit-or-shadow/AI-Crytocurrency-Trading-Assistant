import React, { useEffect, useState } from "react";
import { API_URL } from "./config";
import PriceChart from "./components/PriceChart";
import type { PricePoint } from "./components/PriceChart";
import RiskNote from "./components/RiskNote";
import WhyPanel from "./WhyPanel";
import type { AITrade, AIDecision } from "./WhyPanel";

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
  const chartData: PricePoint[] = (history?.price_history ?? []).map((point) => {
    const chartPoint: PricePoint = { time: point.time, price: point.price };
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
      <div className="panel-head">
        <h3>Live session</h3>
        <span className="panel-note">Paper trading, simulated money</span>
      </div>

      <div className="ai-controls">
        <button className="btn btn-primary" onClick={startAI} disabled={history?.running}>Start AI trader</button>
        <button className="btn btn-secondary" onClick={stopAI} disabled={!history?.running}>Stop</button>
        <span className="state-text" data-running={history?.running ? "true" : "false"} role="status">
          {history?.running ? "Running" : "Stopped"}
        </span>
      </div>
      {message && <p className="status-message" role="status">{message}</p>}

      <div className="notice-stack">
        <RiskNote>Markers on the chart are the simulated AI's trades. They are not signals to copy.</RiskNote>
        {history && history.rl_model_loaded === false && history.running && (
          <p className="notice" role="status">
            <strong>No trained model.</strong> The AI only holds. Run <code>python backtest.py</code> in
            the backend folder to train one.
          </p>
        )}
      </div>

      {chartData.length === 0 ? (
        <p className="chart-empty">No data yet. Start the AI trader and wait a few seconds for prices to arrive.</p>
      ) : (
        <>
          <PriceChart
            data={chartData}
            markers
            formatTime={formatTime}
            label={`${crypto} price with AI buy and sell markers`}
          />
          <div className="chart-legend">
            <span style={{ "--c": "#55c2e8" } as React.CSSProperties}>Price</span>
            <span style={{ "--c": "#f0b44c" } as React.CSSProperties}>AI buy (triangle) and sell (diamond)</span>
          </div>
        </>
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
