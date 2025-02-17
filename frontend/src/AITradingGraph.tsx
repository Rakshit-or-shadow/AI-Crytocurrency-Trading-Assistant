import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface TradeData {
  time: string;
  price: number;
  type: "BUY" | "SELL";
}

const TradingGraph: React.FC = () => {
  const [data, setData] = useState<TradeData[]>([]);

  useEffect(() => {
    fetch("/api/trades") // Fetch data from backend API
      .then((response) => response.json())
      .then((data) => setData(data))
      .catch((error) => console.error("Error fetching trade data:", error));
  }, []);

  return (
    <div style={{ width: "100%", height: 500 }}>
      <h2>Trading Bot Buy/Sell Commands</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="price" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TradingGraph;
