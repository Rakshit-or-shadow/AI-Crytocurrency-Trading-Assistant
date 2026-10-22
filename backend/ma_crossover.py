"""Moving-average crossover strategy (a simple baseline to compare the AI against).

Idea: a short moving average reacts quickly to price changes, a long one reacts slowly.
- When the short average crosses ABOVE the long average, the price is gaining
  momentum -> BUY.
- When it crosses BELOW, momentum is fading -> SELL.

The strategy only looks at the prices it is given (past and present), never the future.
"""


def moving_average(prices, window):
    """Average of the last `window` prices, or None if there are not enough prices."""
    if len(prices) < window:
        return None
    return sum(prices[-window:]) / window


class MovingAverageCrossover:
    name = "Moving-average crossover"

    def __init__(self, short_window=10, long_window=30):
        if short_window >= long_window:
            raise ValueError("short_window must be smaller than long_window")
        self.short_window = short_window
        self.long_window = long_window

    def decide(self, history, in_position):
        """Returns 'buy', 'sell' or 'hold' using prices up to and including today."""
        # We need one extra price so we can also compute yesterday's averages
        if len(history) < self.long_window + 1:
            return "hold"

        short_now = moving_average(history, self.short_window)
        long_now = moving_average(history, self.long_window)
        short_before = moving_average(history[:-1], self.short_window)
        long_before = moving_average(history[:-1], self.long_window)

        crossed_up = short_before <= long_before and short_now > long_now
        crossed_down = short_before >= long_before and short_now < long_now

        if crossed_up and not in_position:
            return "buy"
        if crossed_down and in_position:
            return "sell"
        return "hold"
