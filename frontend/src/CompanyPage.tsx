import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import "./styles.css";

const CompanyPage: React.FC = () => {
  const { companyName } = useParams<{ companyName: string }>();
  const [timeInterval, setTimeInterval] = useState("30sec");

  // Placeholder data (Replace with real data from your backend)
  const sampleData = [
    { time: "10:00", price: 100 },
    { time: "10:30", price: 102 },
    { time: "11:00", price: 98 },
  ];

  return (
    <div className="company-container">
      <h1>{companyName} <br /></h1>

      {/* Dropdown to select time interval */}
      <select
        value={timeInterval}
        onChange={(e) => setTimeInterval(e.target.value)}
        className="dropdown"
      >
        <option value="15sec">15 Seconds</option>
        <option value="30sec">30 Seconds</option>
        <option value="1min">1 Minute</option>
        <option value="2min">2 Minute</option>
        <option value="5min">5 Minute</option>
      </select>

      {/* Graph (Replace sampleData with backend data) */}
      <LineChart width={600} height={300} data={sampleData}>
        <CartesianGrid stroke="#ccc" />
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="price" stroke="#007bff" />
      </LineChart>
    </div>
  );
};

export default CompanyPage;
