# Polish notes

Work log for the `polish` branch. Each phase is one commit. Nothing was pushed and `main` was not touched.

Note: the project is Python (FastAPI) + TypeScript (React). There is no Kotlin/Java in it, so the beginner-friendly style (plain names, small functions, comments) was applied to Python and TypeScript.

## Phase 1 - Repo hygiene

**What changed**
- Stopped tracking (`git rm --cached`, files are NOT deleted from your disk, except `.DS_Store`): `.DS_Store` (deleted), `backend/app/config.json`, `backend/app/src/config.json` (contain real keys), `frontend/node_modules/` (1,047 files were committed) and `frontend/node_modules.zip`.
- `.gitignore` now covers `.DS_Store`, `.env`, `node_modules/`, `venv/`, the config files and the AI trader output file.
- Added MIT `LICENSE` (Rakshit Singh).
- Added `backend/requirements.txt` (full) and `backend/requirements-core.txt` (light, no TensorFlow; used for tests/CI). The old `requirements.txt` was UTF-16 encoded and listed packages it did not use or that were unpinned. New versions are the ones installed and working on this machine (Python 3.12).
- Added `backend/.env.example` and `frontend/.env.example`.
- New `backend/settings.py` reads secrets from environment variables, then `backend/.env`, then the old local `config.json` (so your local setup keeps working). Hardcoded NewsAPI key removed from `ai_trader.py`.
- CORS now uses `ALLOWED_ORIGINS` (default `http://localhost:5173`) instead of `*`.
- "stock" wording: removed the stale path comment in `CompanyPage.tsx`, renamed `shares` to `coin_amount` in `ai_trader.py`. README wording is replaced in Phase 6.

**Secret scan (values redacted)** - these are in git history and are still valid until rotated:
| Secret | Where | First/last commits |
|---|---|---|
| Coinbase CDP API key id `organizations/10b6...a088/apiKeys/01e5...a6` | `backend/app/config.json`, `backend/app/src/config.json` | 6bcaa82, 030eed6 (2025-02-16) and later |
| Coinbase EC private key `MHcC...ANA==` | same two files | same |
| NewsAPI key `8213...7164` | hardcoded in `backend/app/src/ai_trader.py` | 6bcaa82 |

History was NOT rewritten. **Rotate all three** (see manual steps). Removing the files from the latest commit does not remove them from history.

**Verify**: `cd backend/app && python -c "import utils"` works; `cd frontend && npm ci && npm run build` works.

**Skipped / uncertain**: nothing. Docker is not installed on this machine, see Phase 5.

## Phase 2 - Trading logic quality

**What changed**
- `backend/risk.py` (new): `RiskConfig` (defaults: risk 2% of the account per trade, 5% stop-loss, 10% take-profit, max 50% of the account in coins), `position_size_usd`, `stop_loss_price`, `take_profit_price`, `check_exit`.
- `backend/paper_account.py` (new): the buy/sell/balance logic that used to be inline global variables in `utils.py`. Both the API and the AI trader now use it. Behaviour and messages are unchanged.
- `backend/ma_crossover.py` (new): moving-average crossover baseline (10/30 day by default).
- `backend/app/src/ai_trader.py` (rewritten): uses the risk module for sizing and exits, combines RL signal + news sentiment in `decide_action()`, and stores a plain-English `explanation` (sentiment score, RL signal, final action, risk numbers) with every trade. It can now be driven by the API (`step()`, `get_snapshot()`).
- `backend/app/src/rl_model.py` (rewritten): action space is now 3 clear actions (hold/buy/sell) instead of the undefined 7; state is the last 10 daily price changes plus a "holding?" flag; fixed an indexing bug in `train()`; added `train_on_prices()`, save/load.
- `backend/app/utils.py`: now uses `PaperAccount`; new endpoints `POST /ai/start/{coin}`, `POST /ai/stop`, `GET /ai-trading-history` (the frontend already called this URL but it did not exist), `GET /backtest/results`, `GET /backtest/chart`.

**Decisions (ambiguous points)**
- The old trader sold whenever price > buy price and bought 5% of the balance. Replaced by the risk rules above. Percentages are my defaults; change them in `RiskConfig`.
- Random "market boom/crash" price events were mutating the price used for trading. They are now OFF by default (`simulate_events=False`) so paper results reflect the real market.
- The RL model has no pre-trained weights in the repo. Until `python backtest.py` has been run, the live trader says "no trained RL model" and holds. It never fakes a signal.
- News sentiment returns 0 (neutral) when `NEWS_API_KEY` is not set. It now reads at most 20 headlines (before: unlimited, one model call each).
- Trade history format changed from tuples to dicts. The old sample file `backend/app/src/trade_data.json` is stale (old format, no longer written). I left it alone because I may only delete `.DS_Store`; you can delete it. New output goes to `backend/data/ai_trade_data.json` (git-ignored).

**Verify**: `cd backend/app && python -c "import utils"`. The decision logic is covered by tests added in Phase 5.

## Phase 3 - Backtesting

**What changed**
- `backend/fetch_history.py` (new): downloads real daily candles from Coinbase's public market-data endpoint (no key needed). Saved `backend/data/BTC-USD_daily.csv` and `ETH-USD_daily.csv`: 1,000 days each, 2024-01-26 to 2026-10-21, no gaps. **The data is real, not synthetic.**
- `backend/backtest.py` (new): replays history day by day for three strategies (RL agent, moving-average crossover, buy-and-hold) and reports total return, Sharpe ratio, max drawdown, win rate and number of trades. Writes `backtest_results.json` (repo root) and `docs/backtest.png`. Also saves the trained RL weights to `backend/models/rl_BTC.weights.h5` / `rl_ETH.weights.h5`, which the live AI trader loads.
- No lookahead: a strategy is only given prices up to and including today; its order is filled at the next day's price; the RL agent trains only on the first 500 days and every strategy is scored on the last 500 days. Tests in `backend/tests/test_backtest.py` check this directly.

**Results (from the actual run, `python backtest.py`, seed 42, 8 training epochs, takes ~10 minutes on CPU)**

| Coin | Strategy | Return | Sharpe | Max drawdown | Win rate | Trades |
|---|---|---|---|---|---|---|
| BTC-USD | RL agent | -8.0% | -0.33 | -25.2% | 38% | 24 |
| BTC-USD | MA crossover | -0.2% | 0.02 | -10.4% | 33% | 12 |
| BTC-USD | Buy and hold | -24.0% | -0.28 | -53.1% | 0% | 1 |
| ETH-USD | RL agent | +9.2% | 0.60 | -14.8% | 50% | 12 |
| ETH-USD | MA crossover | -1.0% | -0.02 | -15.8% | 50% | 12 |
| ETH-USD | Buy and hold | -12.4% | 0.16 | -67.6% | 0% | 1 |

Test period: 2025-06-09 to 2026-10-21 (500 days). Start $10,000, 0.1% fee per trade.

**Honest reading of the results**
- The test period was a falling market for both coins, so buy-and-hold lost money. The RL agent and MA strategy "beat" it mostly because they keep part of the money in cash (the risk rules cap exposure at 50% of the account, and the position size is smaller still), not necessarily because they predict better. In a rising market buy-and-hold would likely win.
- The RL agent lost money on BTC and made money on ETH. That is a mixed result from ONE random seed and one 500-day window; I did not run multiple seeds, so do not read it as proof the RL model has an edge. Re-running with a different `--seed` can change the numbers.
- Buy-and-hold "win rate 0%" and "1 trade" is just the single position closed at the end of the test at a loss.
- `num_trades` counts closed round trips (buy then sell). Any position still open on the last day is closed at the final price and counted.

**Simplifications** (also listed at the top of `backtest.py`): daily closes only, no slippage, 0.1% fee, stop-loss checked on the daily close.

**Verify**: `cd backend && python backtest.py --no-rl` (fast, skips RL) or the full run. Numbers will match the table for the same seed only approximately if TensorFlow versions differ.

## Phase 4 - Frontend upgrades

**What changed**
- `frontend/src/AITradingGraph.tsx` (rewritten): the old version called `/ai-trading-history`, which did not exist in the backend. It now polls that endpoint every 4 s, has Start/Stop buttons for the AI trader, and draws the price line with **green triangle (buy) and red diamond (sell) markers** where the AI traded.
- `frontend/src/WhyPanel.tsx` (new): "Why did the AI do this?" panel. Shows the latest decision (even "hold") or any trade you click: RL signal, news sentiment score, final action, and the written explanation.
- `frontend/src/Footer.tsx` (new, shown on every page): "Paper trading - simulated money" label, a "not financial advice" disclaimer and links. The paper-trading label is also on the coin page and the AI panel.
- `frontend/src/BacktestPage.tsx` (new, route `/backtest`): reads `/backtest/results` from the API and shows a metrics table plus an equity-curve chart per coin. Linked from the coin list and the footer.
- `frontend/src/config.ts` (new): the API address now comes from `VITE_API_URL` instead of hardcoded `http://localhost:8000` in several places.
- Small fixes: removed an `any` type that failed `npm run lint`, fixed the page title typo ("Asssistant"), removed a stray `<style>` tag in `StartPage.tsx`.

**Decisions**
- Markers are on the AI trading chart, not on the 4-second live price chart. That chart only keeps the last 16 points, so a trade would scroll out of view almost immediately.
- **WebSocket: skipped.** Polling every 4 s is enough for a bot that decides every 20 s. WebSockets would add connection/reconnect handling and a new dependency for no visible benefit. Easy to revisit.
- Styling is plain CSS in `styles/Extras.css` to match the existing files. The project does not actually use Tailwind (it is not installed or imported anywhere), so the README does not claim it.

**Verify**: `cd frontend && npm ci && npm run lint && npm run build`. To see it: start the backend (`cd backend/app && python utils.py`), then `npm run dev`, open `/backtest` and a coin page, click "Watch the AI bot paper trade" then "Start AI trader". Note I could not click through the UI myself (no browser available in this run); the checks I did were lint, type-check/build and calling the API endpoints directly.

## Phase 5 - Tests, CI, Docker

**What changed**
- `backend/tests/` (new, 36 tests, run with `cd backend && python -m pytest tests`): risk rules, buy/sell balance logic, moving-average strategy, backtest metrics (return, Sharpe, drawdown, win rate), the backtest engine (orders fill on the next day, a strategy only ever sees past prices, stop-loss closes a trade) and the AI trader's decision/explanation logic. They need no network and no TensorFlow.
- `.github/workflows/ci.yml` (new): backend job (installs `requirements-core.txt`, checks the API imports, runs pytest) and frontend job (`npm ci`, lint, build). CI uses the light requirements on purpose so it does not download TensorFlow.
- `backend/Dockerfile`, `frontend/Dockerfile` (+ `frontend/nginx.conf`), `docker-compose.yml`, `.dockerignore` (new). Website on http://localhost:3000, API on http://localhost:8000.

**NOT VERIFIED: the Docker files.** Docker is not installed on the machine this was done on, so `docker compose up` was never run. Please run `docker compose up --build` once and tell me if anything breaks. The most likely trouble spots: the CPU-only PyTorch install line in `backend/Dockerfile`, and image size (TensorFlow + PyTorch are large).

CI has also not run yet (it runs on GitHub after you push). I ran the same commands locally and they pass.
