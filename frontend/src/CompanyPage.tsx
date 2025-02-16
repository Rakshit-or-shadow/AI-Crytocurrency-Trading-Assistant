import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const CompanyPage: React.FC = () => {
  const { companyName } = useParams<{ companyName: string }>();
  const [timeInterval, setTimeInterval] = useState(30000); // Default: 30 sec
  const [priceHistory, setPriceHistory] = useState<{ time: string; price: number }[]>([]);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch("http://localhost:8000/price");
        const data = await response.json();
        if (data.price !== null) {
          setPriceHistory((prev) => [
            ...prev.slice(-20), // Keep the last 20 data points for a clean chart
            { time: new Date().toLocaleTimeString(), price: data.price },
          ]);
        }
      } catch (error) {
        console.error("Error fetching price:", error);
      }
    };

    fetchPrice(); // Initial fetch
    const interval = setInterval(fetchPrice, timeInterval);
    return () => clearInterval(interval); // Cleanup on unmount
  }, [timeInterval]);

  return (
    <div className="company-container">
      <h1>{companyName} Live Price</h1>

      {/* Dropdown to select update interval */}
      <select
        value={timeInterval}
        onChange={(e) => setTimeInterval(Number(e.target.value))}
        className="dropdown"
      >
        <option value={15000}>15 Seconds</option>
        <option value={30000}>30 Seconds</option>
        <option value={60000}>1 Minute</option>
        <option value={120000}>2 Minutes</option>
        <option value={300000}>5 Minutes</option>
      </select>

      {/* Live Price Graph */}
      <LineChart width={600} height={400} data={priceHistory}>
        <CartesianGrid stroke="#ccc" />
        <XAxis dataKey="time" />
        <YAxis domain={[92000,'auto']}/>
        <Tooltip />
        <Line type="monotone" dataKey="price" stroke="#007bff" />
      </LineChart>
    </div>
  );
};

export default CompanyPage;