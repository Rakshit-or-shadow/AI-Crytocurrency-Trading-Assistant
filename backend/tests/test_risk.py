from risk import RiskConfig, check_exit, position_size_usd, stop_loss_price, take_profit_price

CONFIG = RiskConfig(risk_per_trade_pct=0.02, stop_loss_pct=0.05,
                    take_profit_pct=0.10, max_exposure_pct=0.50)


def test_stop_loss_and_take_profit_prices():
    assert stop_loss_price(100, CONFIG) == 95
    assert round(take_profit_price(100, CONFIG), 6) == 110


def test_position_size_risks_a_fixed_percent():
    # Account $100,000, risk 2% = $2,000. A 5% stop means a $40,000 position.
    assert position_size_usd(cash=100000, holdings_value=0, config=CONFIG) == 40000


def test_position_size_is_limited_by_max_exposure():
    # Already holding $40,000 of a $100,000 account. The 50% limit leaves only $10,000.
    size = position_size_usd(cash=60000, holdings_value=40000, config=CONFIG)
    assert size == 10000


def test_position_size_is_zero_when_at_max_exposure():
    assert position_size_usd(cash=50000, holdings_value=50000, config=CONFIG) == 0


def test_position_size_never_exceeds_cash():
    tiny_stop = RiskConfig(risk_per_trade_pct=0.02, stop_loss_pct=0.001, max_exposure_pct=1.0)
    assert position_size_usd(cash=1000, holdings_value=0, config=tiny_stop) == 1000


def test_check_exit():
    assert check_exit(100, 94, CONFIG) == "stop_loss"
    assert check_exit(100, 95, CONFIG) == "stop_loss"       # exactly at the stop counts
    assert check_exit(100, 111, CONFIG) == "take_profit"
    assert check_exit(100, 102, CONFIG) is None
    assert check_exit(None, 50, CONFIG) is None              # no open position
