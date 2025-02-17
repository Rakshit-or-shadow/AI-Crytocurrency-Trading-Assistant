from fastapi import FastAPI
import uvicorn
import time
import threading
import json
import os
from coinbase.wallet.client import Client
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


# Load API credentials from src/config.json
config_path = os.path.join(os.path.dirname(__file__), "C:\\Users\\thegi\\OneDrive\\Desktop\\WINTER 2025\\stock-market-simulator\\backend\\app\\config.json")

with open(config_path) as config_file:
    config = json.load(config_file)

api_key = config["api_key"]
api_secret = config["api_secret"]

# Initialize FastAPI app
app = FastAPI()

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from Vite frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods
    allow_headers=["*"],  # Allows all headers
)
# Initialize Coinbase API client
client = Client(api_key, api_secret)

# Initialize Coinbase API client
client = Client(api_key, api_secret)

# Mapping of common cryptocurrency names to ticker symbols
crypto_mapping = {
    "Bitcoin": "BTC",
    "Ethereum": "ETH",
    "Solana": "SOL",
    "Ripple": "XRP",
    "Cardano": "ADA",
    "Dogecoin": "DOGE",
    "Polygon": "MATIC",
    "Litecoin": "LTC",
    "Polkadot": "DOT",
    "Bitcoin Cash": "BCH"
}

# Store latest prices in a dictionary
ticker_prices = {}

def fetch_current_price(crypto: str):
    """Fetches the latest price from Coinbase API for the given cryptocurrency."""
    global ticker_prices
    try:
        ticker = client.get_spot_price(currency_pair=f"{crypto}-USD")  # Fetch price in USD
        ticker_prices[crypto] = float(ticker["amount"])
        print(f"Updated {crypto} price: {ticker_prices[crypto]}")
    except Exception as e:
        print(f"Error fetching {crypto} price: {e}")

@app.get("/price/{crypto_name}")
def get_price(crypto_name: str):
    """Converts crypto name to ticker and returns the latest price."""
    crypto_name = crypto_name.title()  # Capitalize properly for lookup
    crypto_ticker = crypto_mapping.get(crypto_name, crypto_name.upper())
    
    # Always fetch fresh data instead of relying on stored values
    fetch_current_price(crypto_ticker)
    
    return JSONResponse(content={"price": ticker_prices.get(crypto_ticker, 0.0)})


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)