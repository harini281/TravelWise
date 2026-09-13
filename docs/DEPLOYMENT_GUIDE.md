# TravelWise — Production Deployment Guide

This guide provides end-to-end deployment instructions for running TravelWise in production environments, covering the PostgreSQL database, ASP.NET Core Web API gateway, FastAPI AI service, React web client, and Flutter cross-platform mobile/web application.

---

## 1. System Architecture Overview

```text
               Internet / End Users
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
    React Web Frontend          Flutter Mobile/Web
   (Static Assets/Nginx)       (App Stores / Web)
           │                           │
           └─────────────┬─────────────┘
                         │ HTTPS
                         ▼
             Reverse Proxy (Nginx / Caddy)
                         │
                         ▼
               ASP.NET Core Web API (:5179)
             [Single Entry Point Gateway]
                   │               │
      ┌────────────┴───┐       ┌───┴────────────┐
      ▼                ▼       ▼                ▼
PostgreSQL (:5432)   Redis    FastAPI AI Service (:8000)
(Relational Data)   (Cache)   (LangGraph Orchestration)
```

---

## 2. Infrastructure Requirements

| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **Operating System** | Ubuntu 22.04 LTS / Debian 12 / Windows Server 2022 | Ubuntu 24.04 LTS |
| **CPU** | 2 vCPUs | 4+ vCPUs |
| **RAM** | 4 GB | 8 GB |
| **Disk Storage** | 20 GB SSD | 50 GB NVMe SSD |
| **Runtimes** | .NET 8 SDK/Runtime, Python 3.11+, Node.js 20+, Flutter 3.28+ | Latest stable LTS releases |

---

## 3. Database Deployment (PostgreSQL 16)

### 3.1 Installation & Configuration
```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 3.2 Database & User Setup
```sql
-- Connect via psql as postgres user
sudo -u postgres psql

CREATE USER travelwise_user WITH PASSWORD 'strong_production_password';
CREATE DATABASE travelwise OWNER travelwise_user;
GRANT ALL PRIVILEGES ON DATABASE travelwise TO travelwise_user;
\q
```

### 3.3 Connection Pooling & Performance Tuning
In `postgresql.conf`:
- `max_connections = 100`
- `shared_buffers = 1GB`
- `work_mem = 16MB`

---

## 4. Backend Deployment (ASP.NET Core 8 Web API)

### 4.1 Production Configuration (`appsettings.Production.json` or Environment Variables)
Configure the following environment variables:
```bash
export ASPNETCORE_ENVIRONMENT=Production
export DATABASE_URL="Host=127.0.0.1;Port=5432;Database=travelwise;Username=travelwise_user;Password=strong_production_password;Pooling=true;Maximum Pool Size=50;"
export JWT_SECRET="your_strong_cryptographic_key_at_least_32_characters_long"
export AISERVICE_URL="http://127.0.0.1:8000"
export CORS_ALLOWED_ORIGINS="https://travelwise.example.com,https://app.travelwise.example.com"
```

### 4.2 Build & Publish
```bash
cd backend/TravelWise.API
dotnet publish -c Release -o /var/www/travelwise-api
```

### 4.3 Database Schema Migration
Run the automated EF Core migration:
```bash
dotnet ef database update --project backend/TravelWise.API
```

### 4.4 Systemd Service Definition (`/etc/systemd/system/travelwise-api.service`)
```ini
[Unit]
Description=TravelWise ASP.NET Core API Gateway
After=network.target postgresql.service

[Service]
WorkingDirectory=/var/www/travelwise-api
ExecStart=/usr/bin/dotnet /var/www/travelwise-api/TravelWise.API.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=travelwise-api
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false
Environment=URLS=http://127.0.0.1:5179

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable travelwise-api
sudo systemctl start travelwise-api
```

---

## 5. AI Service Deployment (FastAPI + LangGraph)

### 5.1 Environment Setup
```bash
cd /var/www/travelwise-ai
python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn uvicorn[standard]
```

### 5.2 Environment Variables (`/var/www/travelwise-ai/.env`)
```ini
API_BASE_URL=http://127.0.0.1:5179
OPENAI_API_KEY=your_openai_api_key_optional
GEMINI_API_KEY=your_gemini_api_key_optional
ENVIRONMENT=production
PORT=8000
```

### 5.3 Systemd Service Definition (`/etc/systemd/system/travelwise-ai.service`)
```ini
[Unit]
Description=TravelWise Multi-Agent AI Service
After=network.target travelwise-api.service

[Service]
WorkingDirectory=/var/www/travelwise-ai
ExecStart=/var/www/travelwise-ai/.venv/bin/gunicorn main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --timeout 120 \
    --access-logfile /var/log/travelwise-ai-access.log \
    --error-logfile /var/log/travelwise-ai-error.log
Restart=always
RestartSec=10
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable travelwise-ai
sudo systemctl start travelwise-ai
```

---

## 6. React Web Client Deployment

### 6.1 Production Build
```bash
cd frontend
export VITE_API_BASE_URL=https://api.travelwise.example.com
npm ci
npm run build
```
The compiled static assets are located in `frontend/dist/`.

### 6.2 Copy to Web Server
```bash
sudo mkdir -p /var/www/travelwise-web
sudo cp -r dist/* /var/www/travelwise-web/
sudo chown -R www-data:www-data /var/www/travelwise-web
```

---

## 7. Flutter Client Deployment

### 7.1 Web Deployment
```bash
cd mobile
flutter pub get
flutter build web --release --dart-define=API_BASE_URL=https://api.travelwise.example.com
sudo mkdir -p /var/www/travelwise-flutter
sudo cp -r build/web/* /var/www/travelwise-flutter/
```

### 7.2 Mobile Deployment (Android APK / App Bundle)
```bash
# Production APK
flutter build apk --release --dart-define=API_BASE_URL=https://api.travelwise.example.com

# Production App Bundle (for Google Play)
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.travelwise.example.com
```

---

## 8. Reverse Proxy Configuration (Nginx)

Create `/etc/nginx/sites-available/travelwise`:
```nginx
# ASP.NET Core API Gateway
server {
    listen 443 ssl http2;
    server_name api.travelwise.example.com;

    ssl_certificate /etc/letsencrypt/live/api.travelwise.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.travelwise.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5179;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# React Web Client
server {
    listen 443 ssl http2;
    server_name travelwise.example.com;

    ssl_certificate /etc/letsencrypt/live/travelwise.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/travelwise.example.com/privkey.pem;

    root /var/www/travelwise-web;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/travelwise /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 9. Health Monitoring & Verification

Once deployed, verify system components using standard health checks:
```bash
# 1. Check API gateway health
curl -I https://api.travelwise.example.com/api/Trips

# 2. Check AI Service internal health
curl http://127.0.0.1:8000/health

# 3. Check Database connectivity
sudo -u postgres psql -d travelwise -c "SELECT count(*) FROM \"Trips\";"

# 4. Verify systemd statuses
sudo systemctl status travelwise-api
sudo systemctl status travelwise-ai
```
