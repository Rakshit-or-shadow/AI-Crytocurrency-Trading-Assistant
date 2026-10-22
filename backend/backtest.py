"""Backtest: replay history day by day and see how each strategy would have done.

Run it from the backend folder:

    python backtest.py              # trains the RL agent, runs all 3 strategies on BTC and ETH
    python backtest.py --no-rl      # skip the (slow) RL part

It writes:
    backtest_results.json   (in the repo root)  numbers + equity curves
    docs/backtest.png                           equity-curve comparison chart

HOW WE AVOID LOOKING INTO THE FUTURE ("lookahead")
- On each day a strategy is only given the prices up to and including that day.
- Its decision is carried out at the NEXT day's price (like placing an order after the close).
- The RL agent is trained only on the first half of the data and then tested on the
  second half, which it has never seen. All three strategies are scored on that second half.

SIMPLIFICATIONS (honest list)
- Prices are daily closes; there is no intraday movement, slippage or order book.
- Every buy and sell pays a 0.1% fee.
- Stop-loss / take-profit are checked on the daily close, not intraday.
- Moving-average and RL strategies use the risk rules in risk.py (so they usually invest
  only part of the money). Buy-and-hold invests everything on day one. This is a real
  difference that affects returns, so read the numbers with it in mind.
"""
import argparse
import csv
import json
import math
import os
import sys
from datetime import datetime, timezone

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(BACKEND_DIR, ".."))
sys.path.insert(0, BACKEND_DIR)
sys.path.insert(0, os.path.join(BACKEND_DIR, "app", "src"))

import risk
from ma_crossover import MovingAverageCrossover

STARTING_CASH = 10000.0
FEE_PCT = 0.001            # 0.1% per trade
TRAIN_FRACTION = 0.5       # first half = training, second half = test
DAYS_PER_YEAR = 365        # crypto trades every day of the year


# ---------- loading data ----------

def load_prices(csv_path):
    """Reads a CSV with 'date' and 'close' columns. Returns (dates, closing_prices)."""
    dates = []
    prices = []
    with open(csv_path, newline="", encoding="utf-8") as csv_file:
        for row in csv.DictReader(csv_file):
            dates.append(row["date"])
            prices.append(float(row["close"]))
    return dates, prices


# ---------- strategies ----------
# Every strategy has a decide(history, in_position) method that returns 'buy', 'sell' or 'hold'.
# `history` is the list of closing prices up to and including today - nothing from the future.

class BuyAndHold:
    name = "Buy and hold"
    uses_risk_rules = False   # it simply invests everything on day one

    def decide(self, history, in_position):
        return "hold" if in_position else "buy"


class MovingAverageStrategy(MovingAverageCrossover):
    uses_risk_rules = True


class RLStrategy:
    name = "RL agent"
    uses_risk_rules = True

    def __init__(self, agent):
        self.agent = agent

    def decide(self, history, in_position):
        from rl_model import build_state, ACTION_NAMES
        state = build_state(history, in_position)
        if state is None:
            return "hold"
        return ACTION_NAMES[self.agent.act(state)]   # epsilon=0: always the best-known action


# ---------- the backtest engine ----------

def run_backtest(dates, prices, strategy, start_index, risk_config=None,
                 starting_cash=STARTING_CASH, fee_pct=FEE_PCT):
    """Plays the strategy from day `start_index` to the end.

    Returns (equity_curve, trades):
      equity_curve: account value at the end of each day
      trades:       list of closed trades, each with its return
    """
    risk_config = risk_config or risk.RiskConfig()
    cash = starting_cash
    coins = 0.0
    entry_price = None
    cost_of_open_trade = 0.0
    open_trade_date = None
    pending_order = None     # decided yesterday, filled today
    equity_curve = []
    trades = []

    def sell_everything(price, date, reason):
        nonlocal cash, coins, entry_price
        proceeds = coins * price * (1 - fee_pct)
        trades.append({
            "entry_date": open_trade_date,
            "exit_date": date,
            "entry_price": round(entry_price, 2),
            "exit_price": round(price, 2),
            "return_pct": round((proceeds / cost_of_open_trade - 1) * 100, 2),
            "exit_reason": reason,
        })
        cash += proceeds
        coins = 0.0
        entry_price = None

    for day in range(start_index, len(prices)):
        price = prices[day]
        date = dates[day]

        # 1) Fill the order that was decided yesterday, at today's price
        if pending_order == "buy" and coins == 0:
            if strategy.uses_risk_rules:
                spend = risk.position_size_usd(cash, 0.0, risk_config)
            else:
                spend = cash
            if spend > 0:
                coins = spend * (1 - fee_pct) / price
                cash -= spend
                entry_price = price
                cost_of_open_trade = spend
                open_trade_date = date
        elif pending_order == "sell" and coins > 0:
            sell_everything(price, date, pending_reason)
        pending_order = None

        # 2) Record the account value at today's close
        equity_curve.append(cash + coins * price)

        # 3) Decide what to do tomorrow, using only prices up to today
        if day == len(prices) - 1:
            break
        history = prices[:day + 1]
        in_position = coins > 0
        action = strategy.decide(history, in_position)
        reason = "strategy signal"
        if in_position and strategy.uses_risk_rules:
            risk_exit = risk.check_exit(entry_price, price, risk_config)
            if risk_exit:
                action = "sell"
                reason = risk_exit
        if (action == "buy" and not in_position) or (action == "sell" and in_position):
            pending_order = action
            pending_reason = reason

    # Close any position still open on the last day so it counts as a finished trade
    if coins > 0:
        sell_everything(prices[-1], dates[-1], "end of test")
        equity_curve[-1] = cash

    return equity_curve, trades


# ---------- metrics ----------

def compute_metrics(equity_curve, trades, days_per_year=DAYS_PER_YEAR):
    """Turns an equity curve and a trade list into the headline numbers."""
    start_value = equity_curve[0]
    end_value = equity_curve[-1]
    total_return = end_value / start_value - 1

    # Daily returns: how much the account changed each day
    daily_returns = []
    for i in range(1, len(equity_curve)):
        daily_returns.append(equity_curve[i] / equity_curve[i - 1] - 1)

    # Sharpe ratio = average daily return / volatility, scaled to a year (risk-free rate = 0)
    sharpe = 0.0
    if len(daily_returns) > 1:
        average = sum(daily_returns) / len(daily_returns)
        variance = sum((r - average) ** 2 for r in daily_returns) / (len(daily_returns) - 1)
        spread = math.sqrt(variance)
        if spread > 0:
            sharpe = average / spread * math.sqrt(days_per_year)

    # Max drawdown = the worst drop from a previous peak (a negative number)
    peak = equity_curve[0]
    max_drawdown = 0.0
    for value in equity_curve:
        peak = max(peak, value)
        drop = value / peak - 1
        max_drawdown = min(max_drawdown, drop)

    # Win rate = share of closed trades that made money
    win_rate = None
    if trades:
        winners = sum(1 for trade in trades if trade["return_pct"] > 0)
        win_rate = winners / len(trades)

    return {
        "total_return": total_return,
        "sharpe_ratio": sharpe,
        "max_drawdown": max_drawdown,
        "win_rate": win_rate,
        "num_trades": len(trades),
    }


# ---------- putting it all together ----------

def backtest_one_coin(pair, csv_path, use_rl, epochs, seed):
    dates, prices = load_prices(csv_path)
    train_end = int(len(prices) * TRAIN_FRACTION)
    print(f"{pair}: {len(prices)} days, training on days 0-{train_end - 1}, testing on {train_end}-{len(prices) - 1}")

    strategies = []
    if use_rl:
        from rl_model import train_on_prices
        print(f"  Training the RL agent on {dates[0]} .. {dates[train_end - 1]} only")
        agent = train_on_prices(prices[:train_end], epochs=epochs, seed=seed)
        models_dir = os.path.join(BACKEND_DIR, "models")
        agent.save(os.path.join(models_dir, f"rl_{pair.split('-')[0]}.weights.h5"))
        strategies.append(RLStrategy(agent))
    strategies.append(MovingAverageStrategy())
    strategies.append(BuyAndHold())

    test_dates = dates[train_end:]
    coin_result = {
        "data_file": os.path.basename(csv_path),
        "train_period": {"start": dates[0], "end": dates[train_end - 1], "days": train_end},
        "test_period": {"start": test_dates[0], "end": test_dates[-1], "days": len(test_dates)},
        "dates": test_dates,
        "strategies": {},
    }
    for strategy in strategies:
        equity, trades = run_backtest(dates, prices, strategy, start_index=train_end)
        metrics = compute_metrics(equity, trades)
        metrics["equity_curve"] = [round(value, 2) for value in equity]
        metrics["trades"] = trades
        coin_result["strategies"][strategy.name] = metrics
        win = "n/a" if metrics["win_rate"] is None else f"{metrics['win_rate']:.0%}"
        print(f"  {strategy.name:26s} return {metrics['total_return']:+.1%}  sharpe {metrics['sharpe_ratio']:.2f}  "
              f"max drawdown {metrics['max_drawdown']:.1%}  win rate {win}  trades {metrics['num_trades']}")
    return coin_result


def save_chart(results, chart_path):
    """Draws one equity-curve chart per coin and saves it as a picture."""
    import matplotlib
    matplotlib.use("Agg")  # draw to a file, no window needed
    import matplotlib.pyplot as plt

    colors = {"RL agent": "#2a7de1", "Moving-average crossover": "#e8833a", "Buy and hold": "#6b7280"}
    pairs = list(results["results"].keys())
    fig, axes = plt.subplots(1, len(pairs), figsize=(7 * len(pairs), 4.5), squeeze=False)
    for ax, pair in zip(axes[0], pairs):
        coin = results["results"][pair]
        for name, data in coin["strategies"].items():
            ax.plot(range(len(data["equity_curve"])), data["equity_curve"], label=name,
                    color=colors.get(name), linewidth=1.8)
        ticks = list(range(0, coin["test_period"]["days"], max(1, coin["test_period"]["days"] // 5)))
        ax.set_xticks(ticks)
        ax.set_xticklabels([coin["dates"][i] for i in ticks], rotation=30, fontsize=8)
        ax.set_title(f"{pair} - test period {coin['test_period']['start']} to {coin['test_period']['end']}")
        ax.set_ylabel(f"Account value (USD, start ${STARTING_CASH:,.0f})")
        ax.grid(alpha=0.3)
        ax.legend()
    fig.suptitle("Backtest equity curves (simulated trading, past data, not financial advice)", fontsize=10)
    fig.tight_layout()
    os.makedirs(os.path.dirname(chart_path), exist_ok=True)
    fig.savefig(chart_path, dpi=130)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description="Backtest RL, moving-average and buy-and-hold strategies.")
    parser.add_argument("--no-rl", action="store_true", help="skip training and testing the RL agent")
    parser.add_argument("--epochs", type=int, default=8, help="RL training passes over the training data")
    parser.add_argument("--seed", type=int, default=42, help="random seed for the RL agent")
    args = parser.parse_args()

    pairs = ["BTC-USD", "ETH-USD"]
    risk_config = risk.RiskConfig()
    output = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "data_source": "Real daily closing prices from Coinbase's public candles API (backend/fetch_history.py)",
        "settings": {
            "starting_cash": STARTING_CASH,
            "fee_pct": FEE_PCT,
            "train_fraction": TRAIN_FRACTION,
            "rl_seed": args.seed,
            "rl_epochs": args.epochs,
            "rl_included": not args.no_rl,
            "risk_rules": {
                "risk_per_trade_pct": risk_config.risk_per_trade_pct,
                "stop_loss_pct": risk_config.stop_loss_pct,
                "take_profit_pct": risk_config.take_profit_pct,
                "max_exposure_pct": risk_config.max_exposure_pct,
            },
        },
        "results": {},
    }
    for pair in pairs:
        csv_path = os.path.join(BACKEND_DIR, "data", f"{pair}_daily.csv")
        output["results"][pair] = backtest_one_coin(pair, csv_path, not args.no_rl, args.epochs, args.seed)

    results_path = os.path.join(REPO_DIR, "backtest_results.json")
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    save_chart(output, os.path.join(REPO_DIR, "docs", "backtest.png"))
    print(f"Saved {results_path} and docs/backtest.png")


if __name__ == "__main__":
    main()
