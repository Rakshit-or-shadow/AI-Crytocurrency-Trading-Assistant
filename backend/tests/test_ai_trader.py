"""Tests for the AI trader's decision logic (no network, no TensorFlow needed)."""
from ai_trader import AITrader, decide_action


def test_buy_signal_with_neutral_news_buys():
    action, why = decide_action("buy", 0, in_position=False, risk_exit=None)
    assert action == "buy"
    assert "BUY" in why and "RL" in why


def test_negative_news_vetoes_a_buy():
    action, why = decide_action("buy", -3, in_position=False, risk_exit=None)
    assert action == "hold"
    assert "negative" in why


def test_stop_loss_beats_a_buy_or_hold_signal():
    action, why = decide_action("hold", 5, in_position=True, risk_exit="stop_loss")
    assert action == "sell"
    assert "stop-loss" in why


def test_sell_signal_only_sells_when_holding():
    assert decide_action("sell", 0, in_position=True, risk_exit=None)[0] == "sell"
    assert decide_action("sell", 0, in_position=False, risk_exit=None)[0] == "hold"


def make_trader(signals):
    """A trader with no API keys whose RL signal is replaced by a fixed list."""
    trader = AITrader("", "", load_rl_model=False)
    signal_iterator = iter(signals)
    trader.get_rl_signal = lambda: next(signal_iterator)
    return trader


def test_trade_is_stored_with_an_explanation():
    trader = make_trader(["buy"])
    trade = trader.step(100.0, "t1")
    assert trade["action"] == "buy"
    assert trade["explanation"]
    assert trade["rl_signal"] == "buy"
    assert trader.trade_history == [trade]
    # Position size comes from the risk rules: 2% risk / 5% stop = 40% of $100,000
    assert trader.account.cash == 60000


def test_stop_loss_sells_and_loses_about_two_percent_of_the_account():
    trader = make_trader(["buy", "hold"])
    trader.step(100.0, "t1")
    trader.step(94.0, "t2")   # below the 5% stop
    assert trader.entry_price is None
    assert trader.trade_history[-1]["action"] == "sell"
    assert round(trader.account.cash) == 97600
