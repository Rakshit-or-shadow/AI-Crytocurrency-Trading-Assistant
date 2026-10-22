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
