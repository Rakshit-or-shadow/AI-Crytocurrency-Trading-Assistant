import React from "react";
import RiskNote from "./components/RiskNote";

// One trade made by the AI, as sent by the backend
export interface AITrade {
  time: string;
  action: string; // "buy" or "sell"
  price: number;
  quantity: number;
  usd_value: number;
  rl_signal: string;
  sentiment_score: number;
  explanation: string;
}

// The most recent decision, including "hold"
export interface AIDecision {
  time: string;
  action: string;
  price: number;
  rl_signal: string;
  sentiment_score: number;
  explanation: string;
}

interface Props {
  trades: AITrade[];
  lastDecision: AIDecision | null;
  selectedTrade: AITrade | null;
  onSelectTrade: (trade: AITrade) => void;
}

// Shows the explanation for the AI's decisions
const WhyPanel: React.FC<Props> = ({ trades, lastDecision, selectedTrade, onSelectTrade }) => {
  // Show the trade the user clicked, otherwise the latest decision
  const shown = selectedTrade ?? lastDecision;

  return (
    <section className="why" aria-labelledby="why-title">
      <h3 id="why-title">Why did the AI do this?</h3>

      {shown ? (
        <div className="why-card">
          <p className="headline">
            <span className={shown.action === "buy" ? "act-buy" : shown.action === "sell" ? "act-sell" : ""}>
              {shown.action.toUpperCase()}
            </span>{" "}
            at ${shown.price.toFixed(2)}
            <span className="when">{shown.time.replace("T", " ")}</span>
          </p>
          <ul className="kv">
            <li><span className="label">RL model signal</span><span className="value">{shown.rl_signal}</span></li>
            <li><span className="label">News sentiment score</span><span className="value">{shown.sentiment_score}</span></li>
            <li><span className="label">Final action</span><span className="value">{shown.action}</span></li>
          </ul>
          <p className="why-explanation">{shown.explanation}</p>
          <RiskNote>This is a simulated decision, not a recommendation.</RiskNote>
        </div>
      ) : (
        <p className="muted">No decisions yet. The AI decides every 20 seconds once it is running.</p>
      )}

      {trades.length > 0 && (
        <div>
          <h4 className="panel-note" style={{ marginBottom: 8 }}>Select a trade to read its explanation</h4>
          <ul className="trade-list">
            {[...trades].reverse().map((trade) => (
              <li key={trade.time + trade.action}>
                <button
                  className={trade.action === "buy" ? "t-buy" : "t-sell"}
                  aria-pressed={selectedTrade?.time === trade.time && selectedTrade?.action === trade.action}
                  onClick={() => onSelectTrade(trade)}
                >
                  {trade.action.toUpperCase()} {trade.quantity.toFixed(4)} @ ${trade.price.toFixed(2)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default WhyPanel;
