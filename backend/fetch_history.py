"""Downloads daily price history from Coinbase's public market-data API.

This uses the public "Exchange" candles endpoint, so no API key is needed.
Run it from the backend folder:

    python fetch_history.py

It saves backend/data/BTC-USD_daily.csv and backend/data/ETH-USD_daily.csv
with the columns: date,open,high,low,close,volume
"""
import csv
import os
import time
from datetime import datetime, timedelta, timezone

import requests

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
CANDLES_URL = "https://api.exchange.coinbase.com/products/{pair}/candles"
SECONDS_PER_DAY = 86400
MAX_CANDLES_PER_REQUEST = 300  # Coinbase returns at most 300 candles per call


def fetch_daily_candles(pair, days):
    """Returns a list of rows [date, open, high, low, close, volume], oldest first."""
    end = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    start = end - timedelta(days=days)
    rows = {}

    # Ask for the data in chunks of 300 days
    chunk_start = start
    while chunk_start < end:
        chunk_end = min(chunk_start + timedelta(days=MAX_CANDLES_PER_REQUEST - 1), end)
        params = {
            "granularity": SECONDS_PER_DAY,
            "start": chunk_start.isoformat(),
            "end": chunk_end.isoformat(),
        }
        response = requests.get(CANDLES_URL.format(pair=pair), params=params, timeout=30)
        response.raise_for_status()
        # Each candle is [time, low, high, open, close, volume]
        for timestamp, low, high, open_price, close, volume in response.json():
            date = datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%Y-%m-%d")
            rows[date] = [date, open_price, high, low, close, volume]
        chunk_start = chunk_end + timedelta(days=1)
        time.sleep(0.5)  # be polite to the API

    # Today's candle is still being formed, so leave it out
    today = end.strftime("%Y-%m-%d")
    return [rows[date] for date in sorted(rows) if date < today]


def save_csv(pair, rows):
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, f"{pair}_daily.csv")
    with open(path, "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(["date", "open", "high", "low", "close", "volume"])
        writer.writerows(rows)
    print(f"Saved {len(rows)} days to {path} ({rows[0][0]} to {rows[-1][0]})")


if __name__ == "__main__":
    for trading_pair in ["BTC-USD", "ETH-USD"]:
        save_csv(trading_pair, fetch_daily_candles(trading_pair, days=1000))
