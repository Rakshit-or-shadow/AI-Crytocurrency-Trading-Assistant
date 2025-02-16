import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid} from "recharts";

const CompanyPage: React.FC = () => {
  const { companyName } = useParams<{ companyName: string }>();
  const [timeInterval, setTimeInterval] = useState(4000); // Default: 5 sec
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
      {/* <ResponsiveContainer width="100%" height={400}> */}
        <LineChart width= {900} height={400}  data={priceHistory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="grey"/>
            <YAxis scale="log" domain={[96000, 97000]} tick={{ fontSize: 12 }} stroke="grey"/>
            <Tooltip />
            <Line type="monotone" dataKey="price" stroke="#007bff" strokeWidth={2} />
        </LineChart>
    {/* </ResponsiveContainer> */}
    </div>
  );
};

export default CompanyPage;