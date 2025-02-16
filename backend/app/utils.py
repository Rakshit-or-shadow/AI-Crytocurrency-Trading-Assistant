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
config_path = os.path.join(os.path.dirname(__file__), "/Users/anant_gupta/Documents/University of Alberta/HackED2025/stock-market-simulator/backend/app/config.json")

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

# Store the latest price in a global variable
current_price = {"price": None}

def fetch_current_price():
    """Continuously fetches the latest price from Coinbase API and updates the global variable."""
    global current_price
    while True:
        try:
            ticker = client.get_spot_price(currency_pair="BTC-USD")  # Fetch Bitcoin price in USD
            current_price["price"] = float(ticker["amount"])
            print(f"Updated price: {current_price['price']}")  # Debugging
            print(f"Prices {current_price}")
        except Exception as e:
            print(f"Error fetching price: {e}")
        time.sleep(1)  # Update every second

@app.get("/price")
def get_price():
    """Returns the latest cryptocurrency price."""
    return JSONResponse(content={"price" : current_price.get("price", 0.0)})

# Start the background thread for price updates
thread = threading.Thread(target=fetch_current_price, daemon=True)
thread.start()
2
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)