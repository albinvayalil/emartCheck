FROM python:3.10
WORKDIR /app
COPY . .
RUN pip install flask psycopg2 requests flask_cors
CMD ["python", "app.py"]
