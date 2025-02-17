import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import "./styles/CompanyPage.css"; 
import "./styles/main.css";

const CompanyPage: React.FC = () => {
  const { crypto } = useParams<{ crypto: string }>(); // Get crypto name from URL
  const [timeInterval] = useState(4000);  // 4 sec by default
  const [priceHistory, setPriceHistory] = useState<{ time: string; price: number }[]>([]);
  const [yAxisRange, setYAxisRange] = useState<[number, number] | undefined>(undefined);
  const [message, setMessage] = useState(""); // For status messages

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(`http://localhost:8000/price/${crypto}`);
        const data = await response.json();
        if (data.price !== null) {
          setPriceHistory((prev) => {
            const updatedHistory = [...prev.slice(-20), { time: new Date().toLocaleTimeString(), price: data.price }];
            
            // Set Y-axis range based on the first price received
            if (updatedHistory.length === 1) {
              const basePrice = data.price;
              const rangeMin = parseFloat((basePrice * 0.995).toFixed(2)); // -0.5%
              const rangeMax = parseFloat((basePrice * 1.005).toFixed(2)); // +0.5%
              setYAxisRange([rangeMin, rangeMax]);
            }
            return updatedHistory;
          });
        }
      } catch (error) {
        console.error("Error fetching price:", error);
      }
    };

    fetchPrice(); // Initial fetch
    const interval = setInterval(fetchPrice, timeInterval);
    return () => clearInterval(interval); // Cleanup on unmount
  }, [crypto, timeInterval]);

    // 1️⃣ Buy Crypto
    const handleBuy = async () => {
      try {
        const response = await fetch(`http://localhost:8000/buy/${crypto}`, { method: "POST" });
        const result = await response.json();
        setMessage(result.message || "Buy order placed!");
      } catch (error) {
        console.error("Error buying:", error);
        setMessage("Error placing buy order.");
      }
    };
  
    // 2️⃣ Sell Crypto
    const handleSell = async () => {
      try {
        const response = await fetch(`http://localhost:8000/sell/${crypto}`, { method: "POST" });
        const result = await response.json();
        setMessage(result.message || "Sell order placed!");
      } catch (error) {
        console.error("Error selling:", error);
        setMessage("Error placing sell order.");
      }
    };
  
    // 3️⃣ Reset Portfolio
    const handleReset = async () => {
      try {
        const response = await fetch(`http://localhost:8000/reset`, { method: "POST" });
        const result = await response.json();
        setMessage(result.message || "Portfolio reset!");
      } catch (error) {
        console.error("Error resetting:", error);
        setMessage("Error resetting portfolio.");
      }
    };

  return (
    <div className="graph-container">
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
      <h1 className="crytoHeading">{crypto} Live Price</h1>

      {/* Dropdown to select update interval
      <select
        value={timeInterval}
        onChange={(e) => setTimeInterval(Number(e.target.value))}
        className="dropdown bg-gray-800 text-white p-2 rounded"
      >
        <option value={15000}>15 Seconds</option>
        <option value={30000}>30 Seconds</option>
        <option value={60000}>1 Minute</option>
        <option value={120000}>2 Minutes</option>
        <option value={300000}>5 Minutes</option>
      </select> */}

      {/* Live Price Graph */}
      <div className="w-full max-w-4xl mt-6">
        <LineChart width={900} height={400} data={priceHistory}>
        <CartesianGrid strokeDasharray="3 3" stroke="gray" />
          <XAxis dataKey="time" tick={{ fontSize: 12, fill: "black" }} stroke="black" />
          <YAxis domain={yAxisRange ? yAxisRange : ["auto", "auto"]} tickFormatter={(value) => value.toFixed(2)} tick={{ fontSize: 12, fill: "black" }} stroke="black" />
          <Tooltip formatter={(value) => value.toFixed(2)} contentStyle={{ backgroundColor: "black", borderColor: "black" }} />
          <Line type="monotone" dataKey="price" stroke="#45ba8b" strokeWidth={2} dot={{ fill: "#ffffff" }} />
        </LineChart>
      </div>

        {/* Buttons */}
      <div className="button-container">
        <button className="buy-button" onClick={handleBuy}>Buy</button>
        <button className="sell-button" onClick={handleSell}>Sell</button>
        <button className="reset-button" onClick={handleReset}>Reset</button>
      </div>

      {/* Status Message */}
      {message && <p className="status-message">{message}</p>}

    </div>
    </div>
  );
};

export default CompanyPage;
