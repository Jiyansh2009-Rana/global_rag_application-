FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade -r requirements.txt

RUN apt-get update && \
    apt-get install -y \
        poppler-utils \
        tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

COPY . .

EXPOSE 6000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "6000"]
