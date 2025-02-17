import time
import json
import threading
import random
from coinbase.wallet.client import Client
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
import numpy as np
from transformers import pipeline  # For sentiment analysis
import requests
from datetime import datetime
from rl_model import RLTrader

class AITrader:
    def __init__(self, api_key, api_secret, trading_pair='BTC-USD'):
        self.client = Client(api_key, api_secret)
        self.trading_pair = trading_pair
        self.balance = 100000  # Starting balance in USD
        self.shares = 0
        self.price_history = []  # List to store price history
        self.trade_history = []  # List to store trade actions
        self.running = True
        self.sentiment_analyzer = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")  # Initialize sentiment analyzer
        self.last_trade_time = time.time()  # Track the time of the last trade
        self.start_time = time.time()  # Track the start time of the trading session
        self.sentiment_score = self.fetch_news_sentiment()  # Perform sentiment analysis at the start
        self.rl_trader = RLTrader(state_size=10, action_size=7)  # Initialize RL trader with expanded action space

    def fetch_current_price(self):
        try:
            ticker = self.client.get_spot_price(currency_pair=self.trading_pair)
            return float(ticker['amount'])
        except Exception as e:
            print(f"Error fetching price: {e}")
            return None

    def fetch_historical_data(self):
        try:
            # Coinbase API does not provide historical data in the same way as Binance
            # You may need to use a different service for historical data
            pass
        except Exception as e:
            print(f"Error fetching historical data: {e}")

    def calculate_sma(self, window):
        if len(self.price_history) < window:
            return None
        return np.mean(self.price_history[-window:])

    def fetch_news_sentiment(self):
        try:
            current_month = datetime.now().strftime("%Y-%m")
            response = requests.get(f"https://newsapi.org/v2/everything?q={self.trading_pair}&from={current_month}-01&apiKey=821304adb6e94014bcf96da513164736")
            articles = response.json().get('articles', [])
            print(f"Fetched {len(articles)} articles for sentiment analysis.")
            sentiments = []
            for article in articles:
                title = article['title']
                sentiment = self.sentiment_analyzer(title)[0]['label']
                sentiments.append(sentiment)
                print(f"Article: {title}, Sentiment: {sentiment}")
            positive_sentiment = sentiments.count('POSITIVE')
            negative_sentiment = sentiments.count('NEGATIVE')
            print(f"Positive Sentiment: {positive_sentiment}, Negative Sentiment: {negative_sentiment}")
            return positive_sentiment - negative_sentiment
        except Exception as e:
            print(f"Error fetching news sentiment: {e}")
            return 0

    def calculate_total_value(self):
        current_price = self.fetch_current_price()
        if current_price is None:
            return self.balance
        total_value = self.balance + self.shares * current_price
        return total_value

    def trade(self):
        purchase_price = None  # None means no active buy position

        while self.running and (time.time() - self.start_time) < 600:  # Maximum trading duration of 10 minutes
            current_price = self.fetch_current_price()
            if current_price is None:
                print("Skipping trade due to missing price data")
                time.sleep(1)
                continue

            self.price_history.append(current_price)

            # Introduce random market events
            if random.random() < 0.01:  # 1% chance of a market event
                event_type = random.choice(['boom', 'crash'])
                if event_type == 'boom':
                    current_price *= 1.1  # Increase price by 10%
                    print("Market boom! Price increased by 10%")
                else:
                    current_price *= 0.9  # Decrease price by 10%
                    print("Market crash! Price decreased by 10%")

            sma_short = self.calculate_sma(3)
            sma_long = self.calculate_sma(10)
            if sma_short is None or sma_long is None:
                time.sleep(1)
                continue

            print(f"Current Price: {current_price}, SMA Short: {sma_short}, SMA Long: {sma_long}, "
                f"Sentiment Score: {self.sentiment_score}, Balance: {self.balance}")

            # Execute a trade every 20 seconds
            if (time.time() - self.last_trade_time) >= 20:
                # If no active position, buy 5% of balance in BTC.
                if purchase_price is None:
                    trade_amount_usd = self.balance * 0.05
                    trade_amount_btc = trade_amount_usd / current_price
                    if self.balance >= trade_amount_usd:
                        self.shares += trade_amount_btc
                        self.balance -= trade_amount_usd
                        purchase_price = current_price  # Store buy price
                        self.trade_history.append(('buy', current_price, trade_amount_btc))
                        print(f"Buy {trade_amount_btc:.4f} BTC at {current_price} USD")
                    else:
                        print("Insufficient balance to buy.")
                    self.last_trade_time = time.time()
                # If already holding BTC, check if current price makes profit
                elif current_price > purchase_price:
                    # Sell all shares held
                    trade_amount_btc = self.shares
                    trade_amount_usd = trade_amount_btc * current_price
                    if trade_amount_btc > 0:
                        self.shares -= trade_amount_btc
                        self.balance += trade_amount_usd
                        self.trade_history.append(('sell', current_price, trade_amount_btc))
                        print(f"Sell {trade_amount_btc:.4f} BTC at {current_price} USD")
                        purchase_price = None  # Reset purchase price after profitable sale
                    self.last_trade_time = time.time()
                else:
                    print("Holding position; waiting for profit conditions to sell.")

            total_value = self.calculate_total_value()
            print(f"Total Value: {total_value} USD")
            time.sleep(1)

        print(f"Final balance: {self.balance}")
        print(f"Final total value: {self.calculate_total_value()} USD")
    
    def plot_price_history(self):
        fig, ax = plt.subplots(figsize=(10, 5))
        ax.set_xlabel('Time (minutes)')
        ax.set_ylabel('Price (USD)')
        ax.set_title(f'Price History for {self.trading_pair}')

        line, = ax.plot([], [], label='Price')
        ax.legend()

        def update(frame):
            line.set_data(range(len(self.price_history)), self.price_history)
            ax.relim()
            ax.autoscale_view()
            return line,

        ani = FuncAnimation(fig, update, interval=1000, cache_frame_data=False)
        plt.show()

    def plot_trade_actions(self):
        fig, ax = plt.subplots(figsize=(10, 5))
        ax.set_xlabel('Time (minutes)')
        ax.set_ylabel('Price (USD)')
        ax.set_title(f'Trade Actions for {self.trading_pair}')

        line, = ax.plot([], [], label='Price')
        buy_scatter = ax.scatter([], [], color='green', label='Buy', marker='^')
        sell_scatter = ax.scatter([], [], color='red', label='Sell', marker='v')
        ax.legend()

        def update(frame):
            line.set_data(range(len(self.price_history)), self.price_history)
            buy_times = [i for i, (action, price, amount) in enumerate(self.trade_history) if action == 'buy']
            buy_prices = [price for action, price, amount in self.trade_history if action == 'buy']
            sell_times = [i for i, (action, price, amount) in enumerate(self.trade_history) if action == 'sell']
            sell_prices = [price for action, price, amount in self.trade_history if action == 'sell']
            if buy_times and buy_prices:
                buy_scatter.set_offsets(list(zip(buy_times, buy_prices)))
            if sell_times and sell_prices:
                sell_scatter.set_offsets(list(zip(sell_times, sell_prices)))
            ax.relim()
            ax.autoscale_view()
            return line, buy_scatter, sell_scatter

        ani = FuncAnimation(fig, update, interval=1000, cache_frame_data=False)
        plt.show()

    def stop(self):
        self.running = False

if __name__ == "__main__":
    import os
    import sys
    import json
    import threading

    # Add the parent directory to sys.path so utils.py can be found
    sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
    from utils import crypto_mapping

    # Construct an absolute path to config.json located in backend/app
    config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "config.json"))
    print(f"Looking for config at: {config_path}")
    with open(config_path) as config_file:
        config = json.load(config_file)

    # Print available cryptocurrencies from crypto_mapping
    print("Available cryptocurrencies:")
    for coin, ticker in crypto_mapping.items():
        print(f"{coin}: {ticker}-USD")

    # Ask user to choose a cryptocurrency
    user_input = input("Enter the coin you want to trade (e.g., BTC, Bitcoin, DOGE): ").strip()

    selected_ticker = None
    # Try to match using ticker (e.g., BTC)
    if user_input.upper() in crypto_mapping.values():
        selected_ticker = user_input.upper()
    # Try to match using coin name (e.g., Bitcoin)
    elif user_input.title() in crypto_mapping:
        selected_ticker = crypto_mapping[user_input.title()]
    # If user includes "-USD", remove it and check again (e.g., DOGE-USD)
    elif user_input.upper().endswith("-USD"):
        ticker_candidate = user_input.upper().replace("-USD", "")
        if ticker_candidate in crypto_mapping.values():
            selected_ticker = ticker_candidate

    if selected_ticker:
        trading_pair = f"{selected_ticker}-USD"
        print(f"Starting trader for {trading_pair}")
        
        trader = AITrader(
            api_key=config['api_key'],
            api_secret=config['api_secret'],
            trading_pair=trading_pair
        )

        t = threading.Thread(target=trader.trade)
        t.start()

        # Optionally, start plotting price history and trade actions
        try:
            trader.plot_price_history()
            trader.plot_trade_actions()
        except KeyboardInterrupt:
            trader.stop()
            t.join()
    else:
        print("Invalid cryptocurrency selection.")