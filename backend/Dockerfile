FROM python:3.11-slim


COPY app /app

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]

