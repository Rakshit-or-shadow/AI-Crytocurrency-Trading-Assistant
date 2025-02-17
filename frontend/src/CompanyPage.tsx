import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import "./styles/CompanyPage.css"; 
// import "./styles/main.css";

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
  const [statisticalAnalysis, setStatisticalAnalysis] = useState<any>(null);
  
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

  useEffect(() => {
    const fetchStatisticalAnalysis = async () => {
      try {
        const response = await fetch(`http://localhost:8000/analytics/${cryptoParam}`);
        const data = await response.json();
        setStatisticalAnalysis(data);
      } catch (error) {
        console.error("Error fetching statistical analysis:", error);
        setStatisticalAnalysis({ error: "Failed to load statistical data" });
      }
    };

    fetchStatisticalAnalysis();
  }, [cryptoParam]);

  // ...existing JSX...
  return (
    <div className="main-container">
<div className="left-container">
  <h2>Statistical Analysis</h2>
  {statisticalAnalysis ? (
    statisticalAnalysis.error ? (
      <p>{statisticalAnalysis.error}</p>
    ) : (
      <ul>
        <li>
          <strong>Price Change (24h):</strong> 
          <span className={statisticalAnalysis.price_change_24h >= 0 ? "price-change-positive" : "price-change-negative"}>
            ${statisticalAnalysis.price_change_24h}
          </span>
        </li>
        <li>
          <strong>High (24h):</strong> 
          <span className="high-value">${statisticalAnalysis.high_24h}</span>
        </li>
        <li>
          <strong>Low (24h):</strong> 
          <span className="low-value">${statisticalAnalysis.low_24h}</span>
        </li>
        <li>
          <strong>Volume (24h):</strong> {statisticalAnalysis.volume_24h}
        </li>
        <li>
          <strong>Market Status:</strong> 
          <span className={statisticalAnalysis.volatility === "✅ Stable Market" ? "market-status-green" : "market-status-red"}>
            {statisticalAnalysis.volatility}
          </span>
        </li>
      </ul>
    )
  ) : (
    <p>Loading...</p>
  )}
</div>


      <div className="right-container">
      {/* Middle Column: Graph (UNCHANGED) */}
      <div className="middle-column">
        <h1 className="crypto-heading">{cryptoParam} Live Price</h1>
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
  
    {/* Bottom Section: Full-Width, Same as Chart */}
{/* Bottom Section: Full-Width, Same as Chart */}
<div className="bottom-container">
  <div className="bottom-columns">

    {/* Left Column: Wallet Info */}
    <div className="wallet-container">
      <div className="balance">
        <h3>Balance</h3>
        <p>${portfolio.user_budget.toFixed(2)}</p>
      </div>
      <div className="wallet-info">
        <h3>Holdings:</h3>
        <ul>
          {Object.keys(portfolio.portfolio).length === 0 ? (
            <li>None</li>
          ) : (
            Object.entries(portfolio.portfolio).map(([ticker, usdValue]) => (
              <li key={ticker}>{ticker}: ${usdValue.toFixed(2)}</li>
            ))
          )}
        </ul>
      </div>
    </div>

    {/* Right Column: Buy/Sell & Reset Portfolio */}
    <div className="trading-container">
      <div className="trading-box">
        <h2 className="sidebar-title">BUY / SELL</h2>

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
        <div className="reset-container">
          <button className="reset-button" onClick={handleReset}>RESET PORTFOLIO</button>
        </div>
      </div>
    </div>

  </div>

  {/* Status Message */}
  {message && <p className="status-message">{message}</p>}
</div>
</div>

  
      {/* Status Message */}

    </div>
  );
  
  ;
};

export default CompanyPage;