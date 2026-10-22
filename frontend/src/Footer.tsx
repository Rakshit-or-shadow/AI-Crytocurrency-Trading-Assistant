import React from "react";
import { Link } from "react-router-dom";
import "./styles/Extras.css";

// Shown at the bottom of every page
const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <p className="paper-label">Paper trading - simulated money</p>
      <p>
        Educational project only. Nothing here is financial advice. No real orders are placed
        and no real money is used.
      </p>
      <p>
        <Link to="/welcome">Coins</Link> | <Link to="/backtest">Backtest results</Link>
      </p>
    </footer>
  );
};

export default Footer;
