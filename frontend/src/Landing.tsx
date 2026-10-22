import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteNav from "./components/SiteNav";
import PriceChart from "./components/PriceChart";
import type { PricePoint } from "./components/PriceChart";
import WhyPanel from "./WhyPanel";
import type { AITrade } from "./WhyPanel";
import { GITHUB_URL } from "./config";
import { useReveal } from "./lib/useReveal";
import "./styles/landing.css";

/* ------------------------------------------------------------------ */
/* The live thing: the AI's real decision rules, with the reason shown */
/* ------------------------------------------------------------------ */

type Signal = "buy" | "sell" | "hold";
type News = "positive" | "neutral" | "negative";
type Position = "holding" | "flat";
type RiskExit = "none" | "stop_loss" | "take_profit";

const NEWS_TEXT: Record<News, string> = {
  positive: "positive (more positive than negative headlines)",
  neutral: "neutral",
  negative: "negative (more negative than positive headlines)",
};

// Mirrors decide_action() in backend/app/src/ai_trader.py
function decide(signal: Signal, news: News, position: Position, riskExit: RiskExit) {
  const inPosition = position === "holding";
  const sentiment = NEWS_TEXT[news];
  if (inPosition && riskExit === "stop_loss") {
    return { action: "sell", text: `The price fell to the stop-loss level, so the position is closed to limit the loss. (RL signal: ${signal}, news sentiment: ${sentiment})` };
  }
  if (inPosition && riskExit === "take_profit") {
    return { action: "sell", text: `The price reached the take-profit level, so the profit is locked in. (RL signal: ${signal}, news sentiment: ${sentiment})` };
  }
  if (signal === "sell" && inPosition) {
    return { action: "sell", text: `The RL model signals sell and we hold coins. News sentiment is ${sentiment}.` };
  }
  if (signal === "buy" && !inPosition) {
    if (news === "negative") {
      return { action: "hold", text: `The RL model signals buy, but news sentiment is ${sentiment}, so the buy is skipped.` };
    }
    return { action: "buy", text: `The RL model signals buy and news sentiment is ${sentiment}, so it does not block the trade.` };
  }
  if (signal === "buy" && inPosition) {
    return { action: "hold", text: "The RL model signals buy, but we already hold coins, so nothing is added." };
  }
  if (signal === "sell" && !inPosition) {
    return { action: "hold", text: "The RL model signals sell, but we hold no coins, so there is nothing to sell." };
  }
  return { action: "hold", text: `RL signal is ${signal}, news sentiment is ${sentiment}, nothing to do right now.` };
}

interface ChoiceProps<T extends string> {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

function Choice<T extends string>({ legend, name, value, options, onChange }: ChoiceProps<T>) {
  return (
    <fieldset className="choices">
      <legend>{legend}</legend>
      <div className="choice-row">
        {options.map((option) => (
          <label className="choice" key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const DecisionDemo: React.FC = () => {
  const [signal, setSignal] = useState<Signal>("buy");
  const [news, setNews] = useState<News>("negative");
  const [position, setPosition] = useState<Position>("flat");
  const [riskExit, setRiskExit] = useState<RiskExit>("none");
  const verdict = decide(signal, news, position, riskExit);

  return (
    <div className="try-panel" data-ui>
      <div className="verdict" aria-live="polite">
        <p className="verdict-action" data-action={verdict.action}>{verdict.action.toUpperCase()}</p>
        <p className="verdict-text">{verdict.text}</p>
      </div>
      <Choice
        legend="What the reinforcement-learning model says"
        name="signal"
        value={signal}
        onChange={setSignal}
        options={[
          { value: "buy", label: "Buy" },
          { value: "hold", label: "Hold" },
          { value: "sell", label: "Sell" },
        ]}
      />
      <Choice
        legend="What the news headlines say"
        name="news"
        value={news}
        onChange={setNews}
        options={[
          { value: "positive", label: "Positive" },
          { value: "neutral", label: "Neutral" },
          { value: "negative", label: "Negative" },
        ]}
      />
      <Choice
        legend="Does the account hold the coin?"
        name="position"
        value={position}
        onChange={setPosition}
        options={[
          { value: "flat", label: "No coins held" },
          { value: "holding", label: "Holding coins" },
        ]}
      />
      <Choice
        legend="Has a risk rule triggered?"
        name="risk"
        value={riskExit}
        onChange={setRiskExit}
        options={[
          { value: "none", label: "No" },
          { value: "stop_loss", label: "Stop-loss" },
          { value: "take_profit", label: "Take-profit" },
        ]}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Dashboard preview: the real chart and Why panel, fed with sample data */
/* ------------------------------------------------------------------ */

const SAMPLE_TRADES: AITrade[] = [
  {
    time: "2026-01-14T09:10:20",
    action: "buy",
    price: 41210.5,
    quantity: 0.0485,
    usd_value: 2000,
    rl_signal: "buy",
    sentiment_score: 0.2,
    explanation:
      "BUY: the RL model signals buy and news sentiment is positive (+0.2: more positive than negative headlines), so it does not block the trade. Risk rules: spend $2,000.00 (risking 2% of the account).",
  },
  {
    time: "2026-01-14T09:21:40",
    action: "sell",
    price: 41630.0,
    quantity: 0.0485,
    usd_value: 2019.06,
    rl_signal: "sell",
    sentiment_score: 0.1,
    explanation:
      "SELL: the RL model signals sell and we hold coins. News sentiment is positive (+0.1: more positive than negative headlines). Result of this trade: +0.95%.",
  },
];

function sampleSeries(): PricePoint[] {
  const points: PricePoint[] = [];
  let price = 41100;
  for (let i = 0; i < 60; i++) {
    price += Math.sin(i / 4.2) * 26 + Math.cos(i / 1.7) * 11 + (i < 24 ? 7 : -1.5);
    const minutes = 9 * 60 + i * 1;
    const time = `2026-01-14T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
    points.push({ time, price: Math.round(price * 100) / 100 });
  }
  const buy = points[10];
  const sell = points[21];
  SAMPLE_TRADES[0] = { ...SAMPLE_TRADES[0], time: buy.time, price: buy.price };
  SAMPLE_TRADES[1] = { ...SAMPLE_TRADES[1], time: sell.time, price: sell.price };
  buy.buy = buy.price;
  sell.sell = sell.price;
  return points;
}

const DashboardPreview: React.FC = () => {
  const data = useMemo(sampleSeries, []);
  return (
    <div className="preview-frame" data-ui inert>
      <div className="app-grid">
        <section className="panel" aria-label="Sample price chart with AI trade markers">
          <div className="panel-head">
            <h3>Bitcoin, AI paper trader</h3>
            <span className="panel-note">Sample data</span>
          </div>
          <PriceChart
            data={data}
            markers
            formatTime={(value) => (value.split("T")[1] ?? value).slice(0, 5)}
            label="Sample Bitcoin price line with one AI buy marker and one AI sell marker"
          />
        </section>
        <section className="panel" aria-label="Sample explanation of an AI decision">
          <WhyPanel
            trades={[SAMPLE_TRADES[0], SAMPLE_TRADES[1]]}
            lastDecision={null}
            selectedTrade={SAMPLE_TRADES[0]}
            onSelectTrade={() => undefined}
          />
        </section>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */

const CAPABILITIES = [
  { name: "Live prices", value: "10 coins from the Coinbase API" },
  { name: "Paper wallet", value: "$250,000 of simulated cash" },
  { name: "AI trader", value: "Start and stop it from the page" },
  { name: "Explained trades", value: "A written reason for every one" },
  { name: "Risk rules", value: "Stop-loss, take-profit, exposure cap" },
  { name: "Backtests", value: "Three strategies on real daily prices" },
];

const Landing: React.FC = () => {
  useReveal();

  return (
    <div className="landing">
      <section className="hero" aria-labelledby="hero-title">
        <SiteNav variant="landing" />
        <div className="hero-title-wrap">
          <h1 id="hero-title">
            <span className="line"><span>Every trade,</span></span>
            <span className="line"><span>explained.</span></span>
          </h1>
        </div>
        <div className="hero-foot">
          <p className="lead">
            A paper-trading assistant for crypto. A learning model, the day&rsquo;s news and risk
            rules make each call, and it tells you why.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/app">Open the app</Link>
            <p className="hero-note">
              <strong>Not financial advice.</strong> Simulated money. Trading crypto carries risk.
            </p>
          </div>
        </div>
      </section>

      <main id="main">
        <section className="section how" id="how" aria-labelledby="how-title">
          <h2 id="how-title" className="reveal">From data to a decision.</h2>
          <div className="stages reveal" data-d="1" data-ui>
            <div className="stage">
              <span className="stage-time">Every 4 seconds</span>
              <span className="stage-name">Data</span>
            </div>
            <div className="stage">
              <span className="stage-time">Every 20 seconds</span>
              <span className="stage-name">AI analysis</span>
            </div>
            <div className="stage">
              <span className="stage-time">With every decision</span>
              <span className="stage-name">Signal</span>
            </div>
          </div>
          <div className="stage-notes reveal" data-d="2">
            <p><b>First,</b> live prices come in from Coinbase, and recent headlines are scored for sentiment.</p>
            <p><b>Then</b> a reinforcement-learning model reads the price history and signals buy, hold or sell. Bad news can veto a buy.</p>
            <p><b>Finally</b> risk rules size the trade or close it, and the reason is written down in plain English.</p>
          </div>
        </section>

        <section className="section" aria-labelledby="try-title">
          <div className="try">
            <div className="try-copy">
              <h2 id="try-title" className="reveal">Try the rules.</h2>
              <p className="lead reveal" data-d="1">
                These are the AI trader&rsquo;s own decision rules, in the order it applies them.
                Set the situation and see what it would do, and what it would say.
              </p>
            </div>
            <div className="reveal" data-d="1">
              <DecisionDemo />
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="menu-title">
          <div className="menu-head">
            <h2 id="menu-title" className="reveal">What is in the app.</h2>
            <p className="lead reveal" data-d="1">
              Everything runs on simulated money. No account, no real orders.
            </p>
          </div>
          <ul className="menu-list">
            {CAPABILITIES.map((item) => (
              <li key={item.name} className="reveal">
                <span className="name">{item.name}</span>
                <span className="value">{item.value}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="section" aria-labelledby="preview-title">
          <div className="preview-head">
            <h2 id="preview-title" className="reveal">Reasons beside the trades.</h2>
            <p className="lead reveal" data-d="1">
              Buy and sell markers sit on the price line. Select one and its explanation opens.
            </p>
          </div>
          <div className="reveal" data-d="1" data-ui>
            <DashboardPreview />
            <p className="preview-caption">
              A preview with sample numbers, not live data and not a result.
            </p>
          </div>
        </section>

        <section className="section proof" aria-labelledby="proof-title">
          <div className="proof-head">
            <h2 id="proof-title" className="reveal">Backtested, with losses.</h2>
            <p className="lead reveal" data-d="1">
              On 500 days of real Bitcoin prices, from June 2025 to October 2026, the model lost
              less than holding. It still lost.
            </p>
          </div>
          <div className="specimens reveal" data-d="1">
            <figure className="specimen">
              <span className="big-crop"><span className="big" aria-label="minus 8.0 percent">&minus;8.0%</span></span>
              <figcaption>RL agent, BTC-USD</figcaption>
            </figure>
            <figure className="specimen">
              <span className="big-crop"><span className="big" aria-label="minus 24.0 percent">&minus;24.0%</span></span>
              <figcaption>Buy and hold, BTC-USD</figcaption>
            </figure>
          </div>
          <p className="proof-note">
            One short window on one market, with a 0.1% fee per trade. On Ethereum the same model
            made +9.2% against &minus;12.4% for holding, which tells you little about next month.
            Past results do not predict future ones. See all of it on the{" "}
            <Link to="/backtest">backtest page</Link>.
          </p>
        </section>

        <Link className="cta" to="/app">
          <div className="cta-top">
            <p>Open the paper-trading desk. No account, no real money.</p>
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              <path d="M14 34 34 14M18 14h16v16" />
            </svg>
          </div>
          <span className="cta-word">Open</span>
        </Link>
      </main>

      <footer className="footer">
        <div className="footer-top">
          <div>
            <h2>Read the code. Run it yourself.</h2>
            <a className="btn btn-primary" href={GITHUB_URL} target="_blank" rel="noreferrer">
              View on GitHub
            </a>
          </div>
          <span aria-hidden="true" />
          <nav className="footer-links" aria-label="Footer">
            <Link to="/app">Markets</Link>
            <Link to="/backtest">Backtest results</Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
          </nav>
        </div>
        <div className="footer-legal">
          <p><strong>Not financial advice.</strong> Trading crypto carries risk. Paper trading only.</p>
          <p>Built by FailedInvestmentBankers at HackED 2025.</p>
        </div>
        <p className="footer-name" aria-hidden="true">Assistant</p>
      </footer>
    </div>
  );
};

export default Landing;
