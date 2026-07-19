FROM python:3.11.8-slim

WORKDIR /app/backend

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE $PORT

CMD gunicorn app.main:app --workers 2 --bind 0.0.0.0:$PORT
