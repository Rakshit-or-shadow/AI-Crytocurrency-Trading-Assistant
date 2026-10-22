import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { API_URL } from "./config";
import SiteNav from "./components/SiteNav";
import RiskNote from "./components/RiskNote";
import { CHART } from "./lib/chartColors";
import { signedPercent } from "./lib/format";

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

// The primary accent marks the model; the other two lines stay neutral so the chart stays readable
const LINE_COLORS: { [name: string]: string } = {
  "RL agent": CHART.signal,
  "Moving-average crossover": CHART.amber,
  "Buy and hold": "#a4b1b5",
};

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
    <div className="app">
      <SiteNav variant="app" />
      <main className="app-main" id="main">
        <div className="page-head">
          <h1>Backtest results</h1>
          <p className="panel-note">Simulated money, past data. Past results do not predict future ones.</p>
          <RiskNote />
        </div>

        {error && <p className="notice" role="status">{error}</p>}

        {data && (
          <>
            <p className="bt-meta">
              Data: {data.data_source}. Start balance ${data.settings.starting_cash.toLocaleString()}, fee{" "}
              {(data.settings.fee_pct * 100).toFixed(1)}% per trade. Generated {data.generated_at}.
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
                <section key={pair} className="bt-section" aria-labelledby={`bt-${pair}`}>
                  <h2 id={`bt-${pair}`}>{pair}</h2>
                  <p className="bt-meta">
                    Test period: {coin.test_period.start} to {coin.test_period.end} ({coin.test_period.days} days).
                    The RL agent only learned from the data before this period.
                  </p>

                  <div className="panel">
                    <div className="table-wrap">
                      <table className="table">
                        <caption className="visually-hidden">Strategy results for {pair}</caption>
                        <thead>
                          <tr>
                            <th scope="col">Strategy</th>
                            <th scope="col">Total return</th>
                            <th scope="col">Sharpe</th>
                            <th scope="col">Max drawdown</th>
                            <th scope="col">Win rate</th>
                            <th scope="col">Trades</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(coin.strategies).map(([name, result]) => (
                            <tr key={name}>
                              <td>{name}</td>
                              <td className={result.total_return >= 0 ? "up" : "down"}>
                                {signedPercent(result.total_return)}
                              </td>
                              <td>{result.sharpe_ratio.toFixed(2)}</td>
                              <td>{signedPercent(-Math.abs(result.max_drawdown))}</td>
                              <td>{result.win_rate === null ? "n/a" : `${(result.win_rate * 100).toFixed(1)}%`}</td>
                              <td>{result.num_trades}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-head">
                      <h3>Account value over the test period</h3>
                      <span className="panel-note">US dollars</span>
                    </div>
                    <div className="chart-box" role="img" aria-label={`${pair} account value for each strategy over time`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                          <CartesianGrid stroke={CHART.grid} vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 13, fill: CHART.axis }} stroke={CHART.grid} minTickGap={56} />
                          <YAxis
                            domain={["auto", "auto"]}
                            tick={{ fontSize: 13, fill: CHART.axis }}
                            stroke={CHART.grid}
                            width={64}
                            tickFormatter={(value: number) => `$${Math.round(value / 100) / 10}k`}
                          />
                          <Tooltip
                            contentStyle={{ background: "#1b242a", border: "none", borderRadius: 8, color: "#edf2f1" }}
                            labelStyle={{ color: "#a4b1b5" }}
                            formatter={(value) => (typeof value === "number" ? `$${value.toFixed(2)}` : value)}
                          />
                          {Object.keys(coin.strategies).map((name) => (
                            <Line
                              key={name}
                              type="monotone"
                              dataKey={name}
                              stroke={LINE_COLORS[name] ?? CHART.axis}
                              dot={false}
                              strokeWidth={2}
                              isAnimationActive={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-legend">
                      {Object.keys(coin.strategies).map((name) => (
                        <span key={name} style={{ "--c": LINE_COLORS[name] ?? CHART.axis } as React.CSSProperties}>
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}

            <p className="bt-meta" style={{ marginTop: 24 }}>
              <a href={`${API_URL}/backtest/chart`} target="_blank" rel="noreferrer">
                Open the saved comparison chart (PNG)
              </a>
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default BacktestPage;
