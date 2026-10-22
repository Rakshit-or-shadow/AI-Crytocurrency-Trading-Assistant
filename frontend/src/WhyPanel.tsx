import React from "react";

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
    <div className="why-panel">
      <h3>Why did the AI do this?</h3>

      {shown ? (
        <div className="why-detail">
          <p>
            <strong>{shown.action.toUpperCase()}</strong> at ${shown.price.toFixed(2)}
            <span className="why-time"> ({shown.time.replace("T", " ")})</span>
          </p>
          <ul>
            <li>RL model signal: <strong>{shown.rl_signal}</strong></li>
            <li>News sentiment score: <strong>{shown.sentiment_score}</strong></li>
            <li>Final action: <strong>{shown.action}</strong></li>
          </ul>
          <p className="why-explanation">{shown.explanation}</p>
        </div>
      ) : (
        <p>No decisions yet. The AI decides every 20 seconds once it is running.</p>
      )}

      {trades.length > 0 && (
        <>
          <h4>Click a trade to see its explanation</h4>
          <ul className="trade-list">
            {[...trades].reverse().map((trade) => (
              <li key={trade.time + trade.action}>
                <button
                  className={trade.action === "buy" ? "trade-buy" : "trade-sell"}
                  onClick={() => onSelectTrade(trade)}
                >
                  {trade.action.toUpperCase()} {trade.quantity.toFixed(4)} @ ${trade.price.toFixed(2)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default WhyPanel;
