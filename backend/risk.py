"""Risk management rules for the paper trader.

Four simple rules protect the (simulated) account:
1. Position sizing  - risk only a fixed % of the account on each trade.
2. Stop-loss        - sell if the price falls a set % below the entry price.
3. Take-profit      - sell if the price rises a set % above the entry price.
4. Max exposure     - never hold more than a set % of the account in coins.

All functions are small and pure (no network, no global state) so they are easy to test.
"""
from dataclasses import dataclass


@dataclass
class RiskConfig:
    """The knobs that control risk. Percentages are written as fractions (0.02 = 2%)."""
    risk_per_trade_pct: float = 0.02   # Lose at most 2% of the account if the stop-loss is hit
    stop_loss_pct: float = 0.05        # Sell if price drops 5% below entry
    take_profit_pct: float = 0.10      # Sell if price rises 10% above entry
    max_exposure_pct: float = 0.50     # At most 50% of the account may be in coins


def stop_loss_price(entry_price, config):
    """The price at which we give up on a trade and sell to limit the loss."""
    return entry_price * (1 - config.stop_loss_pct)


def take_profit_price(entry_price, config):
    """The price at which we sell to lock in the profit."""
    return entry_price * (1 + config.take_profit_pct)


def position_size_usd(cash, holdings_value, config):
    """How many dollars to spend on a new buy.

    Example: account = $100,000, risk 2%, stop-loss 5%.
      Money we accept to lose = 2% of 100,000 = $2,000.
      If the price drops 5% we lose 5% of the position, so
      position = 2,000 / 0.05 = $40,000.
    The result is then capped by the max exposure limit and by the cash we have.
    """
    account_value = cash + holdings_value
    money_at_risk = account_value * config.risk_per_trade_pct
    wanted = money_at_risk / config.stop_loss_pct

    # Max exposure: how much more could we hold before hitting the limit?
    room_left = account_value * config.max_exposure_pct - holdings_value
    room_left = max(room_left, 0.0)

    return max(min(wanted, room_left, cash), 0.0)


def check_exit(entry_price, current_price, config):
    """Returns 'stop_loss', 'take_profit' or None (keep holding)."""
    if entry_price is None or entry_price <= 0:
        return None
    if current_price <= stop_loss_price(entry_price, config):
        return "stop_loss"
    if current_price >= take_profit_price(entry_price, config):
        return "take_profit"
    return None
