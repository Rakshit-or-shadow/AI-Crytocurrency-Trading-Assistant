import React from "react";
import { Link } from "react-router-dom";
import SiteNav from "./components/SiteNav";
import RiskNote from "./components/RiskNote";

// The coins the backend can price
const COINS = [
  { name: "Bitcoin", ticker: "BTC" },
  { name: "Ethereum", ticker: "ETH" },
  { name: "Solana", ticker: "SOL" },
  { name: "Ripple", ticker: "XRP" },
  { name: "Cardano", ticker: "ADA" },
  { name: "Dogecoin", ticker: "DOGE" },
  { name: "Polygon", ticker: "MATIC" },
  { name: "Litecoin", ticker: "LTC" },
  { name: "Polkadot", ticker: "DOT" },
  { name: "Bitcoin Cash", ticker: "BCH" },
];

const MarketsPage: React.FC = () => (
  <div className="app">
    <SiteNav variant="app" />
    <main className="app-main" id="main">
      <div className="page-head">
        <h1>Markets</h1>
        <p className="markets-intro">
          Pick a coin to see its live price, 24-hour statistics, your simulated wallet and the AI
          paper trader. Prices come from the Coinbase API; balances are simulated.
        </p>
        <RiskNote />
      </div>

      <section className="panel" aria-labelledby="coins-title">
        <h2 id="coins-title" className="visually-hidden">Available coins</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Coin</th>
                <th scope="col">Ticker</th>
                <th scope="col">Dashboard</th>
              </tr>
            </thead>
            <tbody>
              {COINS.map((coin) => (
                <tr key={coin.name}>
                  <td>{coin.name}</td>
                  <td className="muted">{coin.ticker}</td>
                  <td>
                    <Link to={`/crypto/${coin.name}`} aria-label={`Open the ${coin.name} dashboard`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </div>
);

export default MarketsPage;
