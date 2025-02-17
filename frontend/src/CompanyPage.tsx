import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import "./styles/CompanyPage.css"; 
import "./styles/main.css";

const CompanyPage: React.FC = () => {
  const { crypto } = useParams<{ crypto: string }>();
  // Use crypto parameter if available, else default to "Bitcoin"
  const cryptoParam = crypto ? crypto : "Bitcoin";

  const [timeInterval] = useState(4000);  // 4 sec by default
  const [priceHistory, setPriceHistory] = useState<{ time: string; price: number }[]>([]);
  const [yAxisRange, setYAxisRange] = useState<[number, number] | undefined>(undefined);
  const [message, setMessage] = useState(""); // For status messages

  // New States:
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [portfolio, setPortfolio] = useState<{ user_budget: number; portfolio: { [key: string]: number } }>({
    user_budget: 250000,
    portfolio: {}
  });

  // Fetch current portfolio periodically (every 4 sec)
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch("http://localhost:8000/portfolio");
        const data = await response.json();
        setPortfolio(data);
      } catch (error) {
        console.error("Error fetching portfolio:", error);
      }
    };
    fetchPortfolio();
    const portfolioInterval = setInterval(fetchPortfolio, 4000);
    return () => clearInterval(portfolioInterval);
  }, []);

  // Fetch live price using the validated cryptoParam
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(`http://localhost:8000/price/${cryptoParam}`);
        const data = await response.json();
        if (data.price !== null) {
          setPriceHistory((prev) => {
            const updatedHistory = [
              ...prev.slice(-15),
              { time: new Date().toLocaleTimeString(), price: data.price }
            ];

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
    const priceInterval = setInterval(fetchPrice, timeInterval);
    return () => clearInterval(priceInterval); // Cleanup on unmount
  }, [cryptoParam, timeInterval]);
  
  // 1️⃣ Buy Crypto with Money
  // filepath: /c:/Users/raksh/OneDrive/Documents/stock-market-simulator/frontend/src/CompanyPage.tsx
const handleBuy = async () => {
  const trimmedAmount = buyAmount.trim();
  const money = parseFloat(trimmedAmount);
  if (!trimmedAmount || isNaN(money) || money <= 0) {
    setMessage("Please enter a valid investment amount.");
    return;
  }
  const currentPrice =
    priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].price : null;
  if (!currentPrice) {
    setMessage("Current price unavailable. Try again.");
    return;
  }
  try {
    const response = await fetch(`http://localhost:8000/buy/${cryptoParam}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ money: money }),
    });
    const result = await response.json();
    setMessage(result.message || "Buy order placed!");
  } catch (error) {
    console.error("Error buying:", error);
    setMessage("Error placing buy order.");
  }
};

  // 2️⃣ Sell Crypto with Money
  const handleSell = async () => {
    const trimmedSell = sellAmount.trim();
    const moneyToSell = parseFloat(trimmedSell);
    if (!trimmedSell || isNaN(moneyToSell) || moneyToSell <= 0) {
      setMessage("Please enter a valid sell amount (in USD).");
      return;
    }
    const currentPrice =
      priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].price : null;
    if (!currentPrice) {
      setMessage("Current price unavailable. Try again.");
      return;
    }
    // Convert the USD amount to crypto quantity
    const coinQtyToSell = moneyToSell / currentPrice;
    try {
      const response = await fetch(`http://localhost:8000/sell/${cryptoParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the calculated coin quantity for the sell order
        body: JSON.stringify({ amount: coinQtyToSell }),
      });
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
      const response = await fetch("http://localhost:8000/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      setMessage(result.message || "Portfolio reset!");
      setPortfolio({ user_budget: 250000, portfolio: {} });
    } catch (error) {
      console.error("Error resetting portfolio:", error);
      setMessage("Error resetting portfolio.");
    }
  };

  // ...existing JSX...
  return (
    <div className="main-container">
      
      {/* Left Column: Wallet Info (Purse & Holdings) */}
      <div className="left-column">
        <div className="wallet-info">
          <h3>Purse: ${portfolio.user_budget.toFixed(2)}</h3>
          <h4>Holdings:</h4>
          <ul>
            {Object.keys(portfolio.portfolio).length === 0 ? (
              <li>None</li>
            ) : (
              Object.entries(portfolio.portfolio).map(([ticker, amt]) => (
                <li key={ticker}>{ticker}: {amt as number}</li>
              ))
            )}
          </ul>
        </div>
      </div>
  
      {/* Middle Column: Graph (UNCHANGED) */}
      <div className="middle-column">
        <h1 className="cryptoHeading">{cryptoParam} Live Price</h1>
        <div className="chart-container">
        <LineChart width={900} height={400} data={priceHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="gray" />
            <XAxis dataKey="time" tick={{ fontSize: 12, fill: "white" }} stroke="white" />
            <YAxis domain={yAxisRange ? yAxisRange : ["auto", "auto"]} tickFormatter={(value) => value.toFixed(2)} tick={{ fontSize: 12, fill: "white" }} stroke="white" />
            <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(2) : value} contentStyle={{ backgroundColor: "white", borderColor: "white" }} />
            <Line type="monotone" dataKey="price" stroke="#45ba8b" strokeWidth={2} dot={{ fill: "#ffffff" }} />
          </LineChart>
        </div>
      </div>
  
      {/* Right Column: Buy/Sell & Reset Portfolio */}
      <div className="right-column">
        <div className="trading-box">
          <h2 className="sidebar-title">BUY / SELL</h2>
          <div className="balance">
            <h3>Balance</h3>
            <p>${portfolio.user_budget.toFixed(2)}</p>
          </div>
  
          {/* Buy Section */}
          <div className="trade-input">
            <input 
              type="number"
              placeholder="Investment Amount (USD)"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
            />
            <button className="buy-button" onClick={handleBuy}>BUY</button>
          </div>
  
          {/* Sell Section */}
          <div className="trade-input">
            <input 
              type="number"
              placeholder="Sell Amount (USD)"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
            />
            <button className="sell-button" onClick={handleSell}>SELL</button>
          </div>
  
          {/* Reset Portfolio */}
          <button className="reset-button" onClick={handleReset}>RESET PORTFOLIO</button>
          {message && <p className="status-message">{message}</p>}
        </div>
        
      </div>
  
      {/* Status Message */}

    </div>
  );
  
  ;
};

export default CompanyPage;