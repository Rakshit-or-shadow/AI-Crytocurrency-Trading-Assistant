import math

import pytest

from backtest import BuyAndHold, compute_metrics, run_backtest
from risk import RiskConfig


# ---------- metric calculations ----------

def test_total_return():
    metrics = compute_metrics([100, 110, 121], trades=[])
    assert metrics["total_return"] == pytest.approx(0.21)


def test_max_drawdown():
    # Peak 200, falls to 100 (-50%), then recovers: the worst drop is -50%.
    metrics = compute_metrics([100, 200, 100, 150], trades=[])
    assert metrics["max_drawdown"] == pytest.approx(-0.5)


def test_max_drawdown_is_zero_when_always_rising():
    assert compute_metrics([100, 101, 102], trades=[])["max_drawdown"] == 0


def test_sharpe_ratio():
    equity = [100, 101, 100, 102]
    returns = [equity[i] / equity[i - 1] - 1 for i in range(1, 4)]
    average = sum(returns) / 3
    spread = math.sqrt(sum((r - average) ** 2 for r in returns) / 2)
    expected = average / spread * math.sqrt(365)
    assert compute_metrics(equity, trades=[])["sharpe_ratio"] == pytest.approx(expected)


def test_sharpe_is_zero_for_a_flat_account():
    assert compute_metrics([100, 100, 100], trades=[])["sharpe_ratio"] == 0


def test_win_rate_and_trade_count():
    trades = [{"return_pct": 5.0}, {"return_pct": -2.0}, {"return_pct": 1.0}, {"return_pct": -9.0}]
    metrics = compute_metrics([100, 100], trades)
    assert metrics["win_rate"] == 0.5
    assert metrics["num_trades"] == 4


def test_win_rate_is_none_without_trades():
    assert compute_metrics([100, 100], trades=[])["win_rate"] is None


# ---------- the backtest engine ----------

DATES = [f"day{i}" for i in range(10)]


def test_buy_and_hold_follows_the_price():
    prices = [100.0] * 9 + [200.0]
    equity, trades = run_backtest(DATES, prices, BuyAndHold(), start_index=5, fee_pct=0.0)
    assert equity[0] == 10000                   # nothing is bought on the first day
    assert equity[-1] == pytest.approx(20000)   # price doubled
    assert len(trades) == 1                     # closed at the end of the test


def test_orders_are_filled_at_the_next_days_price_not_the_same_day():
    # The strategy decides to buy on day 5 (price 100), so the fill must be day 6 at 50.
    prices = [100.0] * 6 + [50.0] * 4
    equity, trades = run_backtest(DATES, prices, BuyAndHold(), start_index=5, fee_pct=0.0)
    assert trades[0]["entry_price"] == 50


class SpyStrategy:
    """Records how much history it is shown on each day."""
    name = "spy"
    uses_risk_rules = False

    def __init__(self):
        self.seen_lengths = []
        self.seen_last_prices = []

    def decide(self, history, in_position):
        self.seen_lengths.append(len(history))
        self.seen_last_prices.append(history[-1])
        return "hold"


def test_strategy_never_sees_future_prices():
    prices = [float(i + 1) for i in range(10)]   # the price on day d is d + 1
    spy = SpyStrategy()
    run_backtest(DATES, prices, spy, start_index=4, fee_pct=0.0)
    # On day d the strategy must see exactly d + 1 prices, ending with today's price.
    assert spy.seen_lengths == [5, 6, 7, 8, 9]
    for length, last_price in zip(spy.seen_lengths, spy.seen_last_prices):
        assert last_price == length


class AlwaysBuy:
    name = "always buy"
    uses_risk_rules = True

    def decide(self, history, in_position):
        return "buy"


def test_stop_loss_closes_the_trade():
    prices = [100.0] * 8 + [80.0, 80.0]
    config = RiskConfig(risk_per_trade_pct=0.02, stop_loss_pct=0.05,
                        take_profit_pct=0.50, max_exposure_pct=0.5)
    equity, trades = run_backtest(DATES, prices, AlwaysBuy(), start_index=5,
                                  risk_config=config, fee_pct=0.0)
    assert trades[0]["exit_reason"] == "stop_loss"
    # 40% of the account was invested and lost 20% of that: the account is down 8%.
    assert equity[-1] == pytest.approx(9200)
