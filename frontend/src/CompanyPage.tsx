import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import TradingGraph from "./AITradingGraph";
import { API_URL } from "./config";
import PriceChart from "./components/PriceChart";
import RiskNote from "./components/RiskNote";
import SiteNav from "./components/SiteNav";
import { usd, signedUsd } from "./lib/format";

// What /analytics/{crypto} returns (or an error message)
interface Analytics {
  error?: string;
  price_change_24h?: number;
  high_24h?: number;
  low_24h?: number;
  volume_24h?: string;
  volatility?: string;
}

const CompanyPage: React.FC = () => {
  const { crypto } = useParams<{ crypto: string }>();
  // Use crypto parameter if available, else default to "Bitcoin"
  const cryptoParam = crypto ? crypto : "Bitcoin";

  const [timeInterval] = useState(4000); // 4 sec by default
  const [priceHistory, setPriceHistory] = useState<{ time: string; price: number }[]>([]);
  const [yAxisRange, setYAxisRange] = useState<[number, number] | undefined>(undefined);
  const [message, setMessage] = useState(""); // For status messages

  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [portfolio, setPortfolio] = useState<{ user_budget: number; portfolio: { [key: string]: number } }>({
    user_budget: 250000,
    portfolio: {},
  });
  const [statisticalAnalysis, setStatisticalAnalysis] = useState<Analytics | null>(null);

  // Fetch current portfolio periodically (every 4 sec)
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch(`${API_URL}/portfolio`);
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
        const response = await fetch(`${API_URL}/price/${cryptoParam}`);
        const data = await response.json();
        if (data.price !== null) {
          setPriceHistory((prev) => {
            const updatedHistory = [
              ...prev.slice(-15),
              { time: new Date().toLocaleTimeString(), price: data.price },
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

  // 1. Buy crypto with money
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
      const response = await fetch(`${API_URL}/buy/${cryptoParam}`, {
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

  // 2. Sell crypto with money
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
      const response = await fetch(`${API_URL}/sell/${cryptoParam}`, {
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

  // 3. Reset portfolio
  const handleReset = async () => {
    try {
      const response = await fetch(`${API_URL}/reset`, {
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
        const response = await fetch(`${API_URL}/analytics/${cryptoParam}`);
        const data = await response.json();
        setStatisticalAnalysis(data);
      } catch (error) {
        console.error("Error fetching statistical analysis:", error);
        setStatisticalAnalysis({ error: "Failed to load statistical data" });
      }
    };

    fetchStatisticalAnalysis();
  }, [cryptoParam]);

  const [showAITrading, setShowAITrading] = useState(false);

  const currentPrice = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].price : null;
  const change = statisticalAnalysis?.price_change_24h;

  return (
    <div className="app">
      <SiteNav variant="app" />
      <main className="app-main" id="main">
        <div className="page-head">
          <p className="crumbs"><Link to="/app">Markets</Link> / {cryptoParam}</p>
          <h1>{cryptoParam}</h1>
          <div className="price-now">
            <span className="figure">{currentPrice !== null ? usd(currentPrice) : "Loading price"}</span>
            {change !== undefined && (
              <span className={change >= 0 ? "up" : "down"}>{signedUsd(change)} in 24 hours</span>
            )}
          </div>
          <p className="notice">
            <strong>Paper trading.</strong> All balances are simulated. Not financial advice. Trading crypto carries risk.
          </p>
        </div>

        <div className="app-grid">
          <div className="stack">
            <section className="panel" aria-labelledby="live-title">
              <div className="panel-head">
                <h2 id="live-title">Live price</h2>
                <span className="panel-note">Updates every 4 seconds</span>
              </div>
              {priceHistory.length === 0 ? (
                <p className="chart-empty">Waiting for the first price from the backend.</p>
              ) : (
                <PriceChart
                  data={priceHistory}
                  yDomain={yAxisRange}
                  label={`${cryptoParam} live price in US dollars`}
                />
              )}
            </section>

            <section className="panel" aria-labelledby="ai-title">
              <div className="panel-head">
                <h2 id="ai-title">AI paper trader</h2>
                <span className="panel-note">Explains every decision</span>
              </div>
              <p className="muted">
                A reinforcement-learning model, news sentiment and risk rules decide when to buy and
                sell with simulated money.
              </p>
              <button
                className="btn btn-secondary ai-toggle"
                aria-expanded={showAITrading}
                aria-controls="ai-section"
                onClick={() => setShowAITrading(!showAITrading)}
              >
                {showAITrading ? "Hide the AI trader" : "Watch the AI bot paper trade"}
                <span aria-hidden="true">{showAITrading ? "−" : "+"}</span>
              </button>
              {showAITrading && (
                <div className="ai-wrap" id="ai-section">
                  <TradingGraph crypto={cryptoParam} />
                </div>
              )}
            </section>
          </div>

          <div className="stack side-first">
            <section className="panel" aria-labelledby="stats-title">
              <h2 id="stats-title">24-hour statistics</h2>
              {statisticalAnalysis ? (
                statisticalAnalysis.error ? (
                  <p className="muted">{statisticalAnalysis.error}</p>
                ) : (
                  <ul className="kv">
                    <li>
                      <span className="label">Price change</span>
                      <span className={`value ${(statisticalAnalysis.price_change_24h ?? 0) >= 0 ? "up" : "down"}`}>
                        {signedUsd(statisticalAnalysis.price_change_24h ?? 0)}
                      </span>
                    </li>
                    <li><span className="label">High</span><span className="value">${statisticalAnalysis.high_24h}</span></li>
                    <li><span className="label">Low</span><span className="value">${statisticalAnalysis.low_24h}</span></li>
                    <li><span className="label">Volume</span><span className="value">{statisticalAnalysis.volume_24h}</span></li>
                    <li><span className="label">Market status</span><span className="value">{statisticalAnalysis.volatility}</span></li>
                  </ul>
                )
              ) : (
                <p className="muted">Loading statistics.</p>
              )}
            </section>

            <section className="panel" aria-labelledby="wallet-title">
              <h2 id="wallet-title">Paper wallet</h2>
              <p className="balance-figure">{usd(portfolio.user_budget)}</p>
              <p className="panel-note" style={{ marginBottom: 12 }}>Simulated cash balance</p>
              <ul className="kv" aria-label="Holdings">
                {Object.keys(portfolio.portfolio).length === 0 ? (
                  <li><span className="label">Holdings</span><span className="value">None</span></li>
                ) : (
                  Object.entries(portfolio.portfolio).map(([ticker, usdValue]) => (
                    <li key={ticker}><span className="label">{ticker}</span><span className="value">{usd(usdValue)}</span></li>
                  ))
                )}
              </ul>
            </section>

            <section className="panel" aria-labelledby="trade-title">
              <h2 id="trade-title">Buy or sell</h2>
              <div className="trade-form">
                <div className="field">
                  <label htmlFor="buy-amount">Buy amount (USD)</label>
                  <div className="field-row">
                    <input
                      id="buy-amount"
                      name="buy-amount"
                      autoComplete="off"
                      type="number"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                    />
                    <button className="btn btn-buy" onClick={handleBuy}>Buy</button>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="sell-amount">Sell amount (USD)</label>
                  <div className="field-row">
                    <input
                      id="sell-amount"
                      name="sell-amount"
                      autoComplete="off"
                      type="number"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                    />
                    <button className="btn btn-sell" onClick={handleSell}>Sell</button>
                  </div>
                </div>
                <div className="form-foot">
                  <button className="btn btn-secondary" onClick={handleReset}>Reset portfolio</button>
                </div>
              </div>
              {message && <p className="status-message" role="status">{message}</p>}
              <div style={{ marginTop: 16 }}>
                <RiskNote />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CompanyPage;
