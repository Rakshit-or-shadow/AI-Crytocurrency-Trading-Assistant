import React from "react";
import { Link, NavLink } from "react-router-dom";
import { GITHUB_URL } from "../config";

interface Props {
  variant: "landing" | "app";
}

// Plain top bar: wordmark, a few links, one action.
const SiteNav: React.FC<Props> = ({ variant }) => (
  <header className="nav">
    <a className="skip-link" href="#main">Skip to content</a>
    <Link to="/" className="wordmark">Trading Assistant</Link>
    <nav className="nav-links" aria-label="Main">
      {variant === "landing" ? (
        <a className="nav-link" href="#how">How it works</a>
      ) : (
        <NavLink className="nav-link" to="/app" end>Markets</NavLink>
      )}
      <NavLink className="nav-link" to="/backtest">Backtest</NavLink>
      <a className="nav-link" href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
    </nav>
  </header>
);

export default SiteNav;
