# Backend image. Build it from the REPO ROOT (docker compose does this for you):
#   docker build -f backend/Dockerfile -t crypto-assistant-backend .
FROM python:3.12-slim

WORKDIR /app

# Install the CPU-only version of PyTorch first (the default one is several GB bigger),
# then everything else. The requirements file is copied first so Docker can cache this step.
COPY backend/requirements-core.txt backend/requirements.txt backend/
RUN pip install --no-cache-dir torch==2.11.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r backend/requirements.txt

# The backend code, plus the saved backtest results the API serves
COPY backend backend
COPY backtest_results.json ./
COPY docs/backtest.png docs/backtest.png

WORKDIR /app/backend/app
EXPOSE 8000
CMD ["python", "utils.py"]
