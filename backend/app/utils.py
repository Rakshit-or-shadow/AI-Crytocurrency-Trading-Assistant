import json
import os
import sys
import threading

# Make the backend/ folder (settings.py, risk.py, ...) importable
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_DIR)
sys.path.insert(0, os.path.join(BACKEND_DIR, "app", "src"))  # ai_trader.py, rl_model.py

from fastapi import FastAPI, Request
import uvicorn
from coinbase.wallet.client import Client
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import settings
from paper_account import PaperAccount

# Load API credentials from environment variables (see backend/.env.example)
api_key, api_secret = settings.get_coinbase_credentials()
if not api_key:
    print("Warning: COINBASE_API_KEY is not set. Price requests will fail until you set it.")

# Initialize FastAPI app
app = FastAPI()

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),  # Websites allowed to call the API
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
# The user's paper-trading account (simulated money only)
account = PaperAccount(starting_cash=250000.0)


@app.post("/buy/{crypto}")
async def buy_crypto(crypto: str, request: Request):
    """Buys crypto (with simulated money) for a specified amount of dollars."""
    try:
        data = await request.json()
        money = float(data.get("money", 0))
    except Exception:
        return JSONResponse(content={"message": "Invalid JSON payload."})

    crypto_ticker = crypto_mapping.get(crypto.title(), crypto.upper())
    fetch_current_price(crypto_ticker)
    price = ticker_prices.get(crypto_ticker, 0.0)

    ok, message = account.buy(crypto_ticker, money, price)
    return JSONResponse(content={"message": message})


@app.post("/sell/{crypto}")
async def sell_crypto(crypto: str, request: Request):
    """Sells a specified amount of crypto (coins, not dollars)."""
    try:
        data = await request.json()
        amount = float(data.get("amount", 0))
    except Exception:
        return JSONResponse(content={"message": "Invalid JSON payload."})

    crypto_ticker = crypto_mapping.get(crypto.title(), crypto.upper())
    fetch_current_price(crypto_ticker)
    price = ticker_prices.get(crypto_ticker, 0.0)

    ok, message = account.sell(crypto_ticker, amount, price)
    return JSONResponse(content={
        "message": message,
        "user_budget": account.cash,
        "portfolio": account.holdings,
    })


@app.post("/reset")
def reset_portfolio():
    """Resets the portfolio to initial state."""
    account.reset()
    return JSONResponse(content={"message": "Portfolio has been reset.", "user_budget": account.cash, "portfolio": account.holdings})


@app.get("/portfolio")
def get_portfolio():
    """Returns the current cash and the dollar value of each holding."""
    holdings_value = {}
    for crypto_ticker, amount in account.holdings.items():
        fetch_current_price(crypto_ticker)
        price = ticker_prices.get(crypto_ticker, 0.0)
        holdings_value[crypto_ticker] = round(amount * price, 2)

    return JSONResponse(content={"user_budget": round(account.cash, 2), "portfolio": holdings_value})


# -------------------------------
# AI paper trader endpoints
ai_trader = None  # the running AITrader (None until started)
ai_thread = None


@app.post("/ai/start/{crypto}")
def start_ai_trader(crypto: str):
    """Starts the AI paper trader for a coin in a background thread."""
    global ai_trader, ai_thread
    if ai_trader is not None and ai_trader.running:
        return JSONResponse(content={"message": "The AI trader is already running."})

    # Imported here because it pulls in heavy libraries (TensorFlow)
    from ai_trader import AITrader

    crypto_ticker = crypto_mapping.get(crypto.title(), crypto.upper())
    ai_trader = AITrader(api_key, api_secret, trading_pair=f"{crypto_ticker}-USD")
    ai_thread = threading.Thread(target=ai_trader.trade, daemon=True)
    ai_thread.start()
    return JSONResponse(content={"message": f"AI paper trader started for {crypto_ticker}-USD."})


@app.post("/ai/stop")
def stop_ai_trader():
    """Stops the AI paper trader."""
    if ai_trader is None or not ai_trader.running:
        return JSONResponse(content={"message": "The AI trader is not running."})
    ai_trader.stop()
    return JSONResponse(content={"message": "AI paper trader stopped."})


@app.get("/ai-trading-history")
def get_ai_trading_history():
    """Prices, trades and the explanation for each decision made by the AI trader."""
    if ai_trader is not None:
        return JSONResponse(content=ai_trader.get_snapshot())
    # Not running: show the last saved session if there is one
    saved_file = os.path.join(BACKEND_DIR, "data", "ai_trade_data.json")
    if os.path.exists(saved_file):
        with open(saved_file, encoding="utf-8") as f:
            saved = json.load(f)
        saved["running"] = False
        return JSONResponse(content=saved)
    return JSONResponse(content={"paper_trading": True, "running": False, "price_history": [],
                                 "trades": [], "last_decision": None})


# -------------------------------
# Backtest results (created by backend/backtest.py)
REPO_DIR = os.path.abspath(os.path.join(BACKEND_DIR, ".."))


@app.get("/backtest/results")
def get_backtest_results():
    """The saved backtest results, or a message explaining that none exist yet."""
    results_file = os.path.join(REPO_DIR, "backtest_results.json")
    if not os.path.exists(results_file):
        return JSONResponse(status_code=404, content={"message": "No backtest results yet. Run: python backtest.py"})
    with open(results_file, encoding="utf-8") as f:
        return JSONResponse(content=json.load(f))


@app.get("/backtest/chart")
def get_backtest_chart():
    """The equity-curve comparison picture."""
    chart_file = os.path.join(REPO_DIR, "docs", "backtest.png")
    if not os.path.exists(chart_file):
        return JSONResponse(status_code=404, content={"message": "No backtest chart yet."})
    return FileResponse(chart_file, media_type="image/png")

# Fetches 24h analytics with basic error handling
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
