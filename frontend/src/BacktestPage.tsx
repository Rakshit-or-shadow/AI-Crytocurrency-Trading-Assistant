import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { API_URL } from "./config";
import "./styles/Extras.css";

// The parts of backtest_results.json that this page uses
interface StrategyResult {
  total_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number | null;
  num_trades: number;
  equity_curve: number[];
}

interface CoinResult {
  test_period: { start: string; end: string; days: number };
  dates: string[];
  strategies: { [name: string]: StrategyResult };
}

interface BacktestResults {
  generated_at: string;
  data_source: string;
  settings: { starting_cash: number; fee_pct: number; rl_included: boolean };
  results: { [pair: string]: CoinResult };
}

const LINE_COLORS: { [name: string]: string } = {
  "RL agent": "#4aa3ff",
  "Moving-average crossover": "#ff9f43",
  "Buy and hold": "#b0b7c3",
};

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

const BacktestPage: React.FC = () => {
  const [data, setData] = useState<BacktestResults | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResults = async () => {
      try {
        const response = await fetch(`${API_URL}/backtest/results`);
        if (!response.ok) {
          setError("No backtest results yet. Run `python backtest.py` in the backend folder.");
          return;
        }
        setData(await response.json());
      } catch {
        setError("Could not reach the backend.");
      }
    };
    loadResults();
  }, []);

  return (
    <div className="backtest-page">
      <h1>Backtest results</h1>
      <p className="paper-label">Paper trading - simulated money, past data</p>

      {error && <p className="notice">{error}</p>}

      {data && (
        <>
          <p>
            Data: {data.data_source}. Start balance ${data.settings.starting_cash.toLocaleString()},
            fee {(data.settings.fee_pct * 100).toFixed(1)}% per trade. Generated {data.generated_at}.
            {!data.settings.rl_included && " The RL agent was NOT included in this run."}
          </p>

          {Object.entries(data.results).map(([pair, coin]) => {
            // One chart row per day, with one value per strategy
            const chartData = coin.dates.map((date, day) => {
              const row: { [key: string]: string | number } = { date };
              for (const [name, result] of Object.entries(coin.strategies)) {
                row[name] = result.equity_curve[day];
              }
              return row;
            });

            return (
              <section key={pair} className="backtest-section">
                <h2>{pair}</h2>
                <p>
                  Test period: {coin.test_period.start} to {coin.test_period.end} ({coin.test_period.days} days).
                  The RL agent only learned from the data before this period.
                </p>

                <table className="backtest-table">
                  <thead>
                    <tr>
                      <th>Strategy</th>
                      <th>Total return</th>
                      <th>Sharpe</th>
                      <th>Max drawdown</th>
                      <th>Win rate</th>
                      <th>Trades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(coin.strategies).map(([name, result]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>{percent(result.total_return)}</td>
                        <td>{result.sharpe_ratio.toFixed(2)}</td>
                        <td>{percent(result.max_drawdown)}</td>
                        <td>{result.win_rate === null ? "n/a" : percent(result.win_rate)}</td>
                        <td>{result.num_trades}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <LineChart width={900} height={350} data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="gray" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "white" }} stroke="white" minTickGap={40} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12, fill: "white" }} stroke="white" />
                  <Tooltip formatter={(value) => (typeof value === "number" ? `$${value.toFixed(2)}` : value)} />
                  <Legend />
                  {Object.keys(coin.strategies).map((name) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={LINE_COLORS[name]} dot={false} strokeWidth={2} />
                  ))}
                </LineChart>
              </section>
            );
          })}

          <p>
            <a href={`${API_URL}/backtest/chart`} target="_blank" rel="noreferrer">
              Open the saved comparison chart (PNG)
            </a>
          </p>
          <p className="disclaimer-small">
            Past performance on a short sample says little about the future. Results are simulated
            and are not financial advice.
          </p>
        </>
      )}
    </div>
  );
};

export default BacktestPage;
