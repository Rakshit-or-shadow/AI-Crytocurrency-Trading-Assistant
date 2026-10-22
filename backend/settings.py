"""Reads settings (API keys etc.) from environment variables.

Order of lookup:
1. Real environment variables (what Docker and hosting sites use).
2. A file called backend/.env (handy on your own computer).
3. The old config.json file next to utils.py (kept so older local setups still work).

No secret is ever stored in the code itself.
"""
import json
import os

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))


def load_env_file():
    """Reads backend/.env (if it exists) and copies its lines into os.environ."""
    env_path = os.path.join(BACKEND_DIR, ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            # Skip empty lines and comments
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, value = line.split("=", 1)
            # Real environment variables win over the file
            os.environ.setdefault(name.strip(), value.strip().replace("\n", "\n"))


def get_coinbase_credentials():
    """Returns (api_key, api_secret). Empty strings mean 'not configured'."""
    load_env_file()
    api_key = os.environ.get("COINBASE_API_KEY", "")
    api_secret = os.environ.get("COINBASE_API_SECRET", "")
    if api_key and api_secret:
        return api_key, api_secret

    # Fall back to the old local config.json (it is git-ignored)
    old_config_path = os.path.join(BACKEND_DIR, "app", "config.json")
    if os.path.exists(old_config_path):
        with open(old_config_path, encoding="utf-8") as config_file:
            config = json.load(config_file)
        return config.get("api_key", ""), config.get("api_secret", "")
    return "", ""


def get_news_api_key():
    """Returns the NewsAPI key, or an empty string if it is not set."""
    load_env_file()
    return os.environ.get("NEWS_API_KEY", "")


def get_allowed_origins():
    """Returns the list of websites allowed to call the API (CORS)."""
    load_env_file()
    text = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in text.split(",") if origin.strip()]
