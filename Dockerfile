FROM python:3.11-slim

WORKDIR /app

# Instalar solo lo esencial
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Instalar con optimizaciones de memoria
RUN pip install --no-cache-dir -r requirements.txt && \
    rm -rf /root/.cache/pip && \
    find /usr/local/lib/python3.11 -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true

COPY . .

# Variables de entorno para optimización de memoria
ENV PORT=8080
ENV PYTHONUNBUFFERED=1
ENV TF_CPP_MIN_LOG_LEVEL=3
ENV TF_ENABLE_ONEDNN_OPTS=0
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1

# Configuración para 1GB RAM
CMD gunicorn --bind :$PORT \
    --workers 1 \
    --threads 2 \
    --timeout 300 \
    --worker-class sync \
    --worker-tmp-dir /dev/shm \
    --max-requests 50 \
    --max-requests-jitter 5 \
    --preload \
    --log-level info \
    app:app