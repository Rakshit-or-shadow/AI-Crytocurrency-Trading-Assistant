from fastapi import FastAPI, Request  # Added Request for payload parsing if needed
import uvicorn
import time
import threading
import json
import os
from coinbase.wallet.client import Client
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load API credentials from src/config.json
config_path = os.path.join(os.path.dirname(__file__), "config.json")
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

# -------------------------------
# Global data for user's portfolio
user_budget = 100000.0  # Starting purse in USD
portfolio = {}        # Holdings, keyed by crypto ticker

@app.post("/buy/{crypto}")
async def buy_crypto(crypto: str, request: Request):
    """
    Buys crypto for a specified amount of money.
    Expects JSON: {"money": <investment_amount_in_usd>}
    """
    global user_budget, portfolio
    try:
        data = await request.json()
        money = float(data.get("money", 0))
    except Exception as e:
        return JSONResponse(content={"message": "Invalid JSON payload."})
    
    if money <= 0:
        return JSONResponse(content={"message": "Invalid money amount to invest."})
    
    crypto_name = crypto.title()
    crypto_ticker = crypto_mapping.get(crypto_name, crypto.upper())
    fetch_current_price(crypto_ticker)
    price = ticker_prices.get(crypto_ticker, 0.0)
    if price <= 0:
        return JSONResponse(content={"message": "Price data unavailable."})
    
    # Calculate coin quantity based on money provided
    coinQty = money / price
    if money > user_budget:
        return JSONResponse(content={"message": "Insufficient funds."})
    
    # Update user's purse and holdings
    user_budget -= money
    portfolio[crypto_ticker] = portfolio.get(crypto_ticker, 0) + coinQty

    return JSONResponse(content={"message": f"Bought {coinQty:.4f} {crypto_ticker} for ${money:.2f}."})

@app.post("/sell/{crypto}")
async def sell_crypto(crypto: str, request: Request):
    """
    Sells a specified amount of crypto.
    Expects JSON: {"amount": <amount_to_sell>}
    """
    global user_budget, portfolio
    try:
        data = await request.json()
        amount = float(data.get("amount", 0))
    except Exception as e:
        return JSONResponse(content={"message": "Invalid JSON payload."})
    
    if amount <= 0:
        return JSONResponse(content={"message": "Invalid amount to sell."})
    
    crypto_name = crypto.title()
    crypto_ticker = crypto_mapping.get(crypto_name, crypto.upper())
    holding = portfolio.get(crypto_ticker, 0)
    if amount > holding:
        return JSONResponse(content={"message": f"Not enough {crypto_ticker} holdings."})
    
    fetch_current_price(crypto_ticker)
    price = ticker_prices.get(crypto_ticker, 0.0)
    if price <= 0:
        return JSONResponse(content={"message": "Price data unavailable."})
    
    proceeds = price * amount
    portfolio[crypto_ticker] = holding - amount
    if portfolio[crypto_ticker] == 0:
        del portfolio[crypto_ticker]
    user_budget += proceeds
    
    return JSONResponse(content={
        "message": f"Sold {amount} {crypto_ticker} for ${proceeds:.2f}.",
        "user_budget": user_budget,
        "portfolio": portfolio,
    })

@app.post("/reset")
def reset_portfolio():
    """
    Resets the portfolio to initial state.
    """
    global user_budget, portfolio
    user_budget = 250000.0
    portfolio = {}
    return JSONResponse(content={
        "message": "Portfolio has been reset.",
        "user_budget": user_budget,
        "portfolio": portfolio,
    })

@app.get("/portfolio")
def get_portfolio():
    """
    Returns the current purse and portfolio holdings in USD.
    """
    global user_budget, portfolio

    # Update real-time value of holdings
    holdings_value = {}
    for crypto_ticker, amount in portfolio.items():
        fetch_current_price(crypto_ticker)  # Get latest price
        price = ticker_prices.get(crypto_ticker, 0.0)
        holdings_value[crypto_ticker] = round(amount * price, 2)  # Convert to USD

    return JSONResponse(content={
        "user_budget": round(user_budget, 2),
        "portfolio": holdings_value  # Now shows USD value instead of quantity
    })
    
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)