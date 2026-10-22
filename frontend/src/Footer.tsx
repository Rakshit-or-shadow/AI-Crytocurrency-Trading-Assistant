import React from "react";
import { Link } from "react-router-dom";
import { GITHUB_URL } from "./config";

// Footer for the app screens. The landing page has its own larger close.
const Footer: React.FC = () => (
  <footer className="app-footer">
    <div className="app-footer-inner">
      <p>
        <strong>Not financial advice.</strong> Trading crypto carries risk. Paper trading only:
        balances are simulated and no real orders are placed.
      </p>
      <p>
        <Link to="/app">Markets</Link> · <Link to="/backtest">Backtest</Link> ·{" "}
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
      </p>
    </div>
  </footer>
);

export default Footer;
