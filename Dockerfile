FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Configuración optimizada para memoria limitada
CMD gunicorn --bind :$PORT --workers 1 --threads 1 --timeout 120 --max-requests 100 --max-requests-jitter 10 app:app