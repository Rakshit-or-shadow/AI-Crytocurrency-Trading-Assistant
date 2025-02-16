from fastapi import FastAPI
import uvicorn
import time
import threading
import json
from binance.client import Client

# Load API credentials from config.json
with open('config.json') as config_file:
    config = json.load(config_file)

api_key = config['api_key']
api_secret = config['api_secret']

# Dictionary to convert from crypto name to Binance ticker symbol
crypto_to_ticker = {
    "bitcoin": "BTCUSDT",
    "ethereum": "ETHUSDT",
    "binancecoin": "BNBUSDT",
    "cardano": "ADAUSDT",
    "xrp": "XRPUSDT",
    "solana": "SOLUSDT",
    "polkadot": "DOTUSDT",
    "dogecoin": "DOGEUSDT",
    "polygon": "MATICUSDT",
    "litecoin": "LTCUSDT"
}

# Initialize FastAPI app
app = FastAPI()

# Initialize the Binance API client
client = Client(api_key, api_secret)
current_price = {"price": None}

def fetch_current_price():
    """Continuously fetches the latest price and updates the global variable."""
    global current_price
    while True:
        try:
            ticker = client.get_symbol_ticker(symbol="BTCUSDT")  # Default to BTCUSDT
            current_price["price"] = float(ticker["price"])
        except Exception as e:
            print(f"Error fetching price: {e}")
        time.sleep(1)  # Update every second

@app.get("/price")
def get_price():
    """Returns the latest cryptocurrency price."""
    return current_price

# Start the background thread for price updates
thread = threading.Thread(target=fetch_current_price, daemon=True)
thread.start()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
