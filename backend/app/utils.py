from fastapi import FastAPI, Request
import uvicorn
import json
import os
from coinbase.wallet.client import Client
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load API credentials from config.json
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
    allow_origins=["*"],  # Allows requests from frontend
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
    crypto_name = crypto_name.title()
    crypto_ticker = crypto_mapping.get(crypto_name, crypto_name.upper())
    
    fetch_current_price(crypto_ticker)
    
    return JSONResponse(content={"price": ticker_prices.get(crypto_ticker, 0.0)})

# -------------------------------
# Global data for user's portfolio
user_budget = 250000.0  # Starting purse in USD
portfolio = {}  # Holdings, keyed by crypto ticker

@app.post("/buy/{crypto}")
async def buy_crypto(crypto: str, request: Request):
    """Buys crypto for a specified amount of money."""
    global user_budget, portfolio
    try:
        data = await request.json()
        money = float(data.get("money", 0))
    except Exception:
        return JSONResponse(content={"message": "Invalid JSON payload."})
    
    if money <= 0:
        return JSONResponse(content={"message": "Invalid money amount to invest."})
    
    crypto_ticker = crypto_mapping.get(crypto.title(), crypto.upper())
    fetch_current_price(crypto_ticker)
    price = ticker_prices.get(crypto_ticker, 0.0)
    
    if price <= 0:
        return JSONResponse(content={"message": "Price data unavailable."})
    
    coinQty = money / price
    if money > user_budget:
        return JSONResponse(content={"message": "Insufficient funds."})
    
    user_budget -= money
    portfolio[crypto_ticker] = portfolio.get(crypto_ticker, 0) + coinQty

    return JSONResponse(content={"message": f"Bought {coinQty:.4f} {crypto_ticker} for ${money:.2f}."})

@app.post("/sell/{crypto}")
async def sell_crypto(crypto: str, request: Request):
    """Sells a specified amount of crypto."""
    global user_budget, portfolio
    try:
        data = await request.json()
        amount = float(data.get("amount", 0))
    except Exception:
        return JSONResponse(content={"message": "Invalid JSON payload."})
    
    if amount <= 0:
        return JSONResponse(content={"message": "Invalid amount to sell."})
    
    crypto_ticker = crypto_mapping.get(crypto.title(), crypto.upper())
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
    """Resets the portfolio to initial state."""
    global user_budget, portfolio
    user_budget = 250000.0
    portfolio = {}
    return JSONResponse(content={"message": "Portfolio has been reset.", "user_budget": user_budget, "portfolio": portfolio})

@app.get("/portfolio")
def get_portfolio():
    """Returns the current purse and portfolio holdings in USD."""
    global user_budget, portfolio

    holdings_value = {}
    for crypto_ticker, amount in portfolio.items():
        fetch_current_price(crypto_ticker)
        price = ticker_prices.get(crypto_ticker, 0.0)
        holdings_value[crypto_ticker] = round(amount * price, 2)

    return JSONResponse(content={"user_budget": round(user_budget, 2), "portfolio": holdings_value})

# ✅ FIXED: Updated `get_crypto_analytics()` for better error handling
def get_crypto_analytics(crypto="BTC"):
    """Fetches real-time analytics for a given cryptocurrency using the Coinbase SDK."""
    crypto = crypto.title()  # Ensure correct capitalization
    crypto_ticker = crypto_mapping.get(crypto, crypto.upper())  # Convert to ticker symbol

    try:
        # Get current price
        current_price = float(client.get_spot_price(currency_pair=f"{crypto_ticker}-USD")["amount"])

        # Get historical data (last 24h price change)
        historical_data = client.get_historic_prices(currency_pair=f"{crypto_ticker}-USD", period="day")
        if "prices" not in historical_data or len(historical_data["prices"]) < 2:
            return {"error": "Insufficient data for analysis."}

        # Extract the last 24-hour open price
        open_price = float(historical_data["prices"][-1]["price"])
        price_change_24h = round(current_price - open_price, 2)

        # Get high & low price (24h)
        prices = [float(entry["price"]) for entry in historical_data["prices"]]
        high_24h = round(max(prices), 2)
        low_24h = round(min(prices), 2)

        # Get volume (not provided in Coinbase API, set as placeholder)
        volume_24h = "N/A"

        # Determine volatility warning
        volatility_warning = abs(high_24h - low_24h) / high_24h * 100 > 5

        return {
            "price_change_24h": price_change_24h,
            "high_24h": high_24h,
            "low_24h": low_24h,
            "volume_24h": volume_24h,
            "volatility": "🚨 High Volatility" if volatility_warning else "✅ Stable Market"
        }
    except Exception as e:
        return {"error": f"Failed to fetch data for {crypto_ticker}: {str(e)}"}

@app.get("/analytics/{crypto}")
def get_crypto_analytics_api(crypto: str):
    return JSONResponse(content=get_crypto_analytics(crypto))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
