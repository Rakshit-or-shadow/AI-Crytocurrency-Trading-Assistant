from fastapi import FastAPI
import requests
from bs4 import BeautifulSoup

app = FastAPI()

@app.get("/stock-news/{ticker}")
def get_stock_news(ticker: str):
    url = f"https://www.marketwatch.com/investing/stock/{ticker.lower()}?mod=search_symbol"
    headers = {"User-Agent": "Mozilla/5.0"}

    response = requests.get(url, headers=headers)
    print(response.text)  # Debug: Print the raw HTML

    soup = BeautifulSoup(response.text, "html.parser")

    articles = []
    for item in soup.select("h3.article__headline a"):
        title = item.get_text(strip=True)
        link = item["href"]
        if ticker.lower() in title.lower():
            articles.append({"title": title, "url": link})

    return {"ticker": ticker, "news": articles[:5]}
