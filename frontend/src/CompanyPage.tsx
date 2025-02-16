import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import "./styles/CompanyPage.css";

// import "./styles/main.css";

const CompanyPage: React.FC = () => {
  const { companyName } = useParams<{ companyName: string }>();
  const [priceData, setPriceData] = useState<{ time: string; price: number }[]>([]);
  
  // Fetch live price every second
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch("http://localhost:8000/price");  // Use backend API
        const data = await response.json();
        if (data.price !== undefined && data.price !== null) {
          const now = new Date();
          const timeLabel = now.toLocaleTimeString();
          setPriceData((prevData) => [...prevData, { time: timeLabel, price: data.price }]);
        }
      } catch (error) {
        console.error("Error fetching price:", error);
      }
    };

    const intervalId = setInterval(fetchPrice, 1000);
    return () => clearInterval(intervalId); // Cleanup
  }, []);

  return (
    <div className="company-container">
      <h1>{companyName}</h1>

      {/* Live price chart */}
      <div className="chart-container">
        <LineChart className="linechart" width={700} height={400} data={priceData}>
          <CartesianGrid stroke="rgba(255, 255, 255, 0.2)" />
          <XAxis dataKey="time" stroke="white" />
          <YAxis stroke="white" />
          <Tooltip />
          <Line type="monotone" dataKey="price" stroke="limegreen" strokeWidth={3} />
        </LineChart>
      </div>

      {/* Example Button */}
      <button>Sample Button</button>
    </div>
  );
};

export default CompanyPage;
