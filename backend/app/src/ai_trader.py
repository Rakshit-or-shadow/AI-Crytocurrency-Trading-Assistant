"""The AI paper trader.

Every few seconds it looks at the latest price and decides: buy, sell or hold.
The decision comes from three things:
  1. The reinforcement-learning (RL) model's signal.
  2. A news sentiment score (positive minus negative headlines).
  3. Risk rules (stop-loss, take-profit, position size, max exposure) from risk.py.

Every trade is saved together with a plain-English explanation of why it happened.
This is PAPER TRADING: the balance is simulated and no real orders are ever placed.
"""
import json
import os
import random
import sys
import time
from datetime import datetime

import requests

# Make the backend/ folder (settings.py, risk.py, ...) importable
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, BACKEND_DIR)

import risk
import settings
from paper_account import PaperAccount

DATA_FILE = os.path.join(BACKEND_DIR, "data", "ai_trade_data.json")
MODELS_DIR = os.path.join(BACKEND_DIR, "models")
MAX_POINTS_KEPT = 2000          # keep only the latest prices in memory
SENTIMENT_REFRESH_SECONDS = 1800
MIN_TRADE_USD = 10.0            # ignore buys smaller than this


def describe_sentiment(score):
    """Turns the sentiment number into words."""
    if score > 0:
        return f"positive (+{score}: more positive than negative headlines)"
    if score < 0:
        return f"negative ({score}: more negative than positive headlines)"
    return "neutral (0)"


def decide_action(rl_signal, sentiment_score, in_position, risk_exit):
    """Combines all signals into one action. Returns (action, explanation).

    Rules, in order:
      1. A risk exit (stop-loss / take-profit) always wins and sells.
      2. If the RL model says sell and we hold coins, sell.
      3. If the RL model says buy and we hold nothing, buy - unless the news is negative,
         in which case the news vetoes the buy and we wait.
      4. Otherwise hold.
    """
    sentiment_text = describe_sentiment(sentiment_score)

    if in_position and risk_exit == "stop_loss":
        return "sell", (f"SELL: the price fell to the stop-loss level, so the position is closed "
                        f"to limit the loss. (RL signal: {rl_signal}, news sentiment: {sentiment_text})")
    if in_position and risk_exit == "take_profit":
        return "sell", (f"SELL: the price reached the take-profit level, so the profit is locked in. "
                        f"(RL signal: {rl_signal}, news sentiment: {sentiment_text})")

    if rl_signal == "sell" and in_position:
        return "sell", (f"SELL: the RL model signals sell and we hold coins. "
                        f"News sentiment is {sentiment_text}.")

    if rl_signal == "buy" and not in_position:
        if sentiment_score < 0:
            return "hold", (f"HOLD: the RL model signals buy, but news sentiment is {sentiment_text}, "
                            f"so the buy is skipped.")
        return "buy", (f"BUY: the RL model signals buy and news sentiment is {sentiment_text}, "
                       f"so it does not block the trade.")

    if rl_signal == "unavailable":
        return "hold", "HOLD: no trained RL model is available (run backtest.py to train one)."
    return "hold", (f"HOLD: RL signal is {rl_signal}, news sentiment is {sentiment_text}, "
                    f"nothing to do right now.")


class AITrader:
    def __init__(self, api_key, api_secret, trading_pair="BTC-USD", risk_config=None,
                 starting_balance=100000.0, trade_interval_seconds=20, simulate_events=False,
                 load_rl_model=True):
        self.trading_pair = trading_pair
        self.ticker = trading_pair.split("-")[0]          # "BTC-USD" -> "BTC"
        self.risk_config = risk_config or risk.RiskConfig()
        self.trade_interval_seconds = trade_interval_seconds
        # Random "boom/crash" events change the price on purpose. They are off by default
        # so the paper results reflect the real market.
        self.simulate_events = simulate_events

        self.account = PaperAccount(starting_cash=starting_balance)
        self.price_history = []     # latest prices
        self.price_times = []       # the time of each price (same length as price_history)
        self.trade_history = []     # list of trade dicts, each with an explanation
        self.last_decision = None   # the most recent decision, even if it was "hold"
        self.entry_price = None     # price we bought at (None = not holding)
        self.running = True
        self.last_trade_time = 0.0

        self.client = None
        if api_key and api_secret:
            from coinbase.wallet.client import Client
            self.client = Client(api_key, api_secret)

        self.sentiment_analyzer = None
        self.sentiment_score = 0
        self.last_sentiment_time = 0.0

        self.rl_agent = self._load_rl_agent() if load_rl_model else None

    # ---------- setup helpers ----------

    def _load_rl_agent(self):
        """Loads the trained RL model if one exists. Returns None otherwise."""
        weights_path = os.path.join(MODELS_DIR, f"rl_{self.ticker}.weights.h5")
        if not os.path.exists(weights_path):
            print(f"No trained RL model found at {weights_path}. Run backtest.py to create one.")
            return None
        try:
            from rl_model import RLTrader
            agent = RLTrader()
            agent.load(weights_path)
            return agent
        except Exception as e:
            print(f"Could not load the RL model: {e}")
            return None

    # ---------- data fetching ----------

    def fetch_current_price(self):
        if self.client is None:
            print("No Coinbase credentials configured.")
            return None
        try:
            ticker = self.client.get_spot_price(currency_pair=self.trading_pair)
            return float(ticker["amount"])
        except Exception as e:
            print(f"Error fetching price: {e}")
            return None

    def fetch_news_sentiment(self):
        """Positive headlines minus negative headlines. Returns 0 if news is unavailable."""
        news_api_key = settings.get_news_api_key()
        if not news_api_key:
            print("NEWS_API_KEY is not set, using a neutral sentiment score.")
            return 0
        try:
            if self.sentiment_analyzer is None:
                from transformers import pipeline  # imported here because it is slow to load
                self.sentiment_analyzer = pipeline(
                    "sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")

            current_month = datetime.now().strftime("%Y-%m")
            response = requests.get(
                "https://newsapi.org/v2/everything",
                params={"q": f"{self.ticker} crypto", "from": f"{current_month}-01",
                        "language": "en", "pageSize": 20, "apiKey": news_api_key},
                timeout=15,
            )
            articles = response.json().get("articles", [])
            print(f"Fetched {len(articles)} articles for sentiment analysis.")
            positive = 0
            negative = 0
            for article in articles:
                label = self.sentiment_analyzer(article["title"])[0]["label"]
                if label == "POSITIVE":
                    positive += 1
                elif label == "NEGATIVE":
                    negative += 1
            print(f"Positive: {positive}, Negative: {negative}")
            return positive - negative
        except Exception as e:
            print(f"Error fetching news sentiment: {e}")
            return 0

    def get_rl_signal(self):
        """Asks the RL model what it would do now. Returns 'buy', 'sell', 'hold' or 'unavailable'."""
        if self.rl_agent is None:
            return "unavailable"
        from rl_model import build_state, ACTION_NAMES
        state = build_state(self.price_history, self.entry_price is not None)
        if state is None:
            return "hold"  # not enough price history yet
        return ACTION_NAMES[self.rl_agent.act(state)]

    # ---------- trading ----------

    def current_value(self, price):
        return self.account.total_value({self.ticker: price})

    def record_trade(self, action, price, quantity, time_text, rl_signal, explanation):
        self.trade_history.append({
            "time": time_text,
            "action": action,
            "price": price,
            "quantity": quantity,
            "usd_value": quantity * price,
            "rl_signal": rl_signal,
            "sentiment_score": self.sentiment_score,
            "explanation": explanation,
        })

    def step(self, price, time_text=None):
        """Makes one decision at the given price. Returns the trade dict if a trade happened."""
        time_text = time_text or datetime.now().isoformat(timespec="seconds")
        in_position = self.entry_price is not None
        rl_signal = self.get_rl_signal()
        risk_exit = risk.check_exit(self.entry_price, price, self.risk_config)

        action, explanation = decide_action(rl_signal, self.sentiment_score, in_position, risk_exit)
        executed = None

        if action == "buy":
            holdings_value = self.account.holdings_value({self.ticker: price})
            spend = risk.position_size_usd(self.account.cash, holdings_value, self.risk_config)
            if spend < MIN_TRADE_USD:
                action = "hold"
                explanation = "HOLD: the risk rules allow no new position right now (max exposure reached)."
            else:
                ok, message = self.account.buy(self.ticker, spend, price)
                if ok:
                    self.entry_price = price
                    stop = risk.stop_loss_price(price, self.risk_config)
                    target = risk.take_profit_price(price, self.risk_config)
                    explanation += (f" Risk rules: spend ${spend:,.2f} (risking "
                                    f"{self.risk_config.risk_per_trade_pct:.0%} of the account), "
                                    f"stop-loss ${stop:,.2f}, take-profit ${target:,.2f}.")
                    quantity = spend / price
                    self.record_trade("buy", price, quantity, time_text, rl_signal, explanation)
                    executed = self.trade_history[-1]
                else:
                    action = "hold"
                    explanation = f"HOLD: the buy failed ({message})"

        elif action == "sell":
            quantity = self.account.holdings.get(self.ticker, 0.0)
            ok, message = self.account.sell(self.ticker, quantity, price)
            if ok:
                profit_pct = (price / self.entry_price - 1) * 100 if self.entry_price else 0.0
                explanation += f" Result of this trade: {profit_pct:+.2f}%."
                self.entry_price = None
                self.record_trade("sell", price, quantity, time_text, rl_signal, explanation)
                executed = self.trade_history[-1]
            else:
                action = "hold"
                explanation = f"HOLD: the sell failed ({message})"

        self.last_decision = {
            "time": time_text, "action": action, "price": price,
            "rl_signal": rl_signal, "sentiment_score": self.sentiment_score,
            "explanation": explanation,
        }
        return executed

    def trade(self):
        """Main loop: fetch the price every second, decide every `trade_interval_seconds`."""
        while self.running:
            price = self.fetch_current_price()
            if price is None:
                time.sleep(1)
                continue

            if self.simulate_events and random.random() < 0.01:
                price *= random.choice([1.1, 0.9])  # fake 10% boom or crash

            now_text = datetime.now().isoformat(timespec="seconds")
            self.price_history.append(price)
            self.price_times.append(now_text)
            if len(self.price_history) > MAX_POINTS_KEPT:
                self.price_history.pop(0)
                self.price_times.pop(0)

            # Refresh the news sentiment every 30 minutes
            if time.time() - self.last_sentiment_time > SENTIMENT_REFRESH_SECONDS:
                self.sentiment_score = self.fetch_news_sentiment()
                self.last_sentiment_time = time.time()

            if time.time() - self.last_trade_time >= self.trade_interval_seconds:
                self.last_trade_time = time.time()
                if self.step(price, now_text):
                    self.save_trade_data()
            time.sleep(1)

        self.save_trade_data()

    def get_snapshot(self):
        """Everything the website needs, as a JSON-friendly dict."""
        latest_price = self.price_history[-1] if self.price_history else 0.0
        return {
            "paper_trading": True,
            "running": self.running,
            "trading_pair": self.trading_pair,
            "balance": self.account.cash,
            "coin_amount": self.account.holdings.get(self.ticker, 0.0),
            "total_value": self.current_value(latest_price),
            "sentiment_score": self.sentiment_score,
            "rl_model_loaded": self.rl_agent is not None,
            "price_history": [{"time": t, "price": p}
                              for t, p in zip(self.price_times, self.price_history)],
            "trades": self.trade_history,
            "last_decision": self.last_decision,
        }

    def save_trade_data(self):
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(self.get_snapshot(), f, indent=2)

    def plot_trade_actions(self):
        """Optional live chart for running this file from the command line."""
        import matplotlib.pyplot as plt
        from matplotlib.animation import FuncAnimation

        fig, ax = plt.subplots(figsize=(10, 5))

        def update(_frame):
            ax.clear()
            ax.set_xlabel("Time (seconds)")
            ax.set_ylabel("Price (USD)")
            ax.set_title(f"Paper trades for {self.trading_pair}")
            ax.plot(self.price_history, label="Price")
            for action, color in [("buy", "green"), ("sell", "red")]:
                xs = [self.price_times.index(t["time"]) for t in self.trade_history
                      if t["action"] == action and t["time"] in self.price_times]
                ys = [self.price_history[x] for x in xs]
                ax.scatter(xs, ys, color=color, label=action, zorder=3)
            ax.legend()

        self._animation = FuncAnimation(fig, update, interval=1000, cache_frame_data=False)
        plt.show()

    def stop(self):
        self.running = False


if __name__ == "__main__":
    import threading

    # The coin names we know about (the same list the API uses)
    sys.path.insert(0, os.path.join(BACKEND_DIR, "app"))
    from utils import crypto_mapping

    api_key, api_secret = settings.get_coinbase_credentials()

    print("Available cryptocurrencies:")
    for coin, ticker in crypto_mapping.items():
        print(f"{coin}: {ticker}-USD")

    user_input = input("Enter the coin you want to paper trade (e.g., BTC, Bitcoin, DOGE): ").strip()

    selected_ticker = None
    if user_input.upper() in crypto_mapping.values():
        selected_ticker = user_input.upper()
    elif user_input.title() in crypto_mapping:
        selected_ticker = crypto_mapping[user_input.title()]
    elif user_input.upper().endswith("-USD"):
        candidate = user_input.upper().replace("-USD", "")
        if candidate in crypto_mapping.values():
            selected_ticker = candidate

    if selected_ticker:
        print(f"Starting paper trader for {selected_ticker}-USD (simulated money only)")
        trader = AITrader(api_key, api_secret, trading_pair=f"{selected_ticker}-USD")
        worker = threading.Thread(target=trader.trade)
        worker.start()
        try:
            trader.plot_trade_actions()
        except KeyboardInterrupt:
            pass
        trader.stop()
        worker.join()
    else:
        print("Invalid cryptocurrency selection.")
