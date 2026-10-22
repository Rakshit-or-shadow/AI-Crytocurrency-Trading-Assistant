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
