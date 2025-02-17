import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const AITradingGraph: React.FC = () => {
  const [priceHistory, setPriceHistory] = useState<{ time: string; price: number }[]>([]);

  useEffect(() => {
    const fetchPriceHistory = async () => {
      try {
        const response = await fetch("http://localhost:8000/ai-trading-history");
        const data = await response.json();
        setPriceHistory(data.price_history);
      } catch (error) {
        console.error("Error fetching AI trading history:", error);
      }
    };

    fetchPriceHistory();
  }, []);

  return (
    <div className="ai-trading-graph">
      <h2>AI Trading History</h2>
      <LineChart width={900} height={400} data={priceHistory}>
        <CartesianGrid strokeDasharray="3 3" stroke="gray" />
        <XAxis dataKey="time" tick={{ fontSize: 12, fill: "white" }} stroke="white" />
        <YAxis tickFormatter={(value) => value.toFixed(2)} tick={{ fontSize: 12, fill: "white" }} stroke="white" />
        <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(2) : value} contentStyle={{ backgroundColor: "white", borderColor: "white" }} />
        <Line type="monotone" dataKey="price" stroke="#45ba8b" strokeWidth={2} dot={{ fill: "#ffffff" }} />
      </LineChart>
    </div>
  );
};

export default AITradingGraph;