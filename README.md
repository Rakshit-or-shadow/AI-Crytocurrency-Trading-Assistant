Day 1 – 
Core Development

Setup & Basic UI:

React project is set up with Tailwind CSS.
UI components such as Dashboard, Stock Chart, and Trade Panel are implemented in src.

Real-Time Stock Price API Integration:

FastAPI backend is set up in utils.py.
Real-time stock prices are fetched using the Coinbase API.

Trading System:

State management for player balance, owned stocks, and transaction history is implemented in CompanyPage.tsx.
Buy/sell transactions are handled in the backend.

Stock Market Logic & Sentiment Analysis Prep:

Market events like random stock booms/crashes are introduced in ai_trader.py.
Financial news articles are fetched for sentiment analysis.

Day 2 – 
AI with Reinforcement Learning & Financial Article Analysis

AI Trader (Basic Decision Making):
AI trader fetches real stock prices and implements basic trading strategies in ai_trader.py.

AI with Reinforcement Learning (RL):

TensorFlow is installed, and an RL model is defined and trained in rl_model.py.
The trained RL model makes real-time buy/sell decisions.

Financial Article Sentiment Analysis:

NLP packages for sentiment analysis are installed.
Sentiment is extracted from financial articles using a sentiment analysis model in ai_trader.py.
AI adjusts trading decisions based on sentiment.

Final 4-6 Hours – Polishing, Testing & Deployment

UI/UX Enhancements:
Stock graphs, animations, and layout optimizations are implemented in styles.

Testing & Debugging:
API calls for stock prices and news are tested.
AI trading logic is tested to ensure it reacts properly to market trends.
The reinforcement learning model is verified to adjust dynamically.

Deployment:

The React frontend can be deployed on Vercel.
The FastAPI backend can be deployed on Render or AWS.

Stretch Goals


Performance Optimizations: Not explicitly mentioned in the provided code.
Stock Market News Events: Partially implemented with sentiment analysis.
Multiple AI Personalities: Not explicitly mentioned in the provided code.

