"""A simulated (paper) trading account. No real money or real orders are involved.

It keeps a cash balance and a dictionary of coin holdings, and has two actions:
buy and sell. Both return (success, message) so callers can show the message.
"""

# Quantities smaller than this are treated as zero (avoids float rounding leftovers)
TINY_AMOUNT = 1e-12


class PaperAccount:
    def __init__(self, starting_cash=250000.0):
        self.starting_cash = starting_cash
        self.cash = starting_cash
        self.holdings = {}  # coin ticker -> quantity, for example {"BTC": 0.5}

    def reset(self):
        """Go back to the starting cash and no coins."""
        self.cash = self.starting_cash
        self.holdings = {}

    def buy(self, ticker, usd_amount, price):
        """Spend usd_amount dollars on the coin at the given price."""
        if usd_amount <= 0:
            return False, "Invalid money amount to invest."
        if price <= 0:
            return False, "Price data unavailable."
        if usd_amount > self.cash:
            return False, "Insufficient funds."

        quantity = usd_amount / price
        self.cash -= usd_amount
        self.holdings[ticker] = self.holdings.get(ticker, 0.0) + quantity
        return True, f"Bought {quantity:.4f} {ticker} for ${usd_amount:.2f}."

    def sell(self, ticker, quantity, price):
        """Sell a quantity of coins at the given price."""
        if quantity <= 0:
            return False, "Invalid amount to sell."
        if price <= 0:
            return False, "Price data unavailable."

        held = self.holdings.get(ticker, 0.0)
        if quantity > held:
            return False, f"Not enough {ticker} holdings."

        proceeds = quantity * price
        remaining = held - quantity
        if remaining <= TINY_AMOUNT:
            self.holdings.pop(ticker, None)  # sold everything
        else:
            self.holdings[ticker] = remaining
        self.cash += proceeds
        return True, f"Sold {quantity} {ticker} for ${proceeds:.2f}."

    def holdings_value(self, prices):
        """Total dollar value of all coins, given a dict of current prices."""
        total = 0.0
        for ticker, quantity in self.holdings.items():
            total += quantity * prices.get(ticker, 0.0)
        return total

    def total_value(self, prices):
        """Cash plus the value of all coins."""
        return self.cash + self.holdings_value(prices)
