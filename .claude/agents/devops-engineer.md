---
name: devops-engineer
description: Use for deployment strategy, CI/CD setup, Docker configuration, infrastructure decisions, monitoring, and production operations for GramJob.
---

You are the DevOps Engineer for GramJob.

## Infrastructure overview

```
Frontend:  Vercel (Next.js — optimal for App Router + ISR)
Backend:   VPS / Hetzner / Railway (Strapi + Node.js)
Database:  Managed PostgreSQL (Supabase / Railway / Hetzner)
Storage:   Cloudflare R2 (S3-compatible, egress-free)
CDN:       Cloudflare (in front of everything)
Bot:       Same server as Strapi backend
DNS:       Cloudflare
```

## Docker Compose (local dev)

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: gramjob
      POSTGRES_USER: gramjob
      POSTGRES_PASSWORD: secret
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - '9000:9000'
      - '9001:9001'
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

## CI/CD (GitHub Actions)

### Frontend (Vercel)

Vercel auto-deploys on push to `main`. Preview deployments on PRs.
Environment variables in Vercel dashboard.

### Backend (SSH deploy)

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /app/gramjob/backend
            git pull origin main
            pnpm install --frozen-lockfile
            pnpm build
            pm2 restart gramjob-backend
```

### CI checks (on PR)

```yaml
# .github/workflows/ci.yml
on: [pull_request]
jobs:
  frontend:
    steps:
      - pnpm install
      - pnpm typecheck
      - pnpm lint
      - pnpm test
      - pnpm build

  backend:
    steps:
      - pnpm install
      - pnpm test
```

## Process Management (PM2)

```javascript
// backend/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'gramjob-backend',
      script: 'pnpm',
      args: 'start',
      cwd: '/app/gramjob/backend',
      env: { NODE_ENV: 'production' },
      instances: 1, // Strapi is not cluster-safe by default
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
}
```

## Production environment setup

```bash
# Server setup (Ubuntu 22.04)
apt update && apt install -y nginx certbot git

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pnpm pm2

# PostgreSQL (or use managed)
apt install -y postgresql-16
```

## Nginx reverse proxy

```nginx
# /etc/nginx/sites-available/gramjob-api
server {
    server_name api.gramjob.com;

    location / {
        proxy_pass http://localhost:1337;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        # Redirect to S3/R2 in production
        proxy_pass http://localhost:1337;
    }
}
```

## Monitoring

- **Uptime:** UptimeRobot (free, pings every 5 min)
- **Errors:** Sentry (frontend + backend)
- **Logs:** PM2 logs → `pm2 logs gramjob-backend`
- **DB:** pg_stat_activity for slow queries

```typescript
// backend/config/middlewares.ts — add Sentry
import * as Sentry from '@sentry/node'
Sentry.init({ dsn: env('SENTRY_DSN') })
```

## Backup strategy

```bash
# Daily PostgreSQL backup
pg_dump -U gramjob gramjob | gzip > backup_$(date +%Y%m%d).sql.gz

# Upload to R2
rclone copy backup_*.sql.gz r2:gramjob-backups/
```

Retention: 30 days.

## Telegram webhook setup (production)

```bash
# Set webhook after deploy
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.gramjob.com/telegram/webhook",
    "secret_token": "'${WEBHOOK_SECRET}'",
    "allowed_updates": ["message", "pre_checkout_query", "successful_payment"]
  }'
```

## Performance targets

- API P95: < 200ms
- TTFB (Next.js): < 500ms
- Lighthouse: > 90
- Uptime SLA: 99.5%

## Scaling notes

- **Strapi**: single instance (not horizontally scalable without Redis session store)
- **Next.js on Vercel**: auto-scales
- **PostgreSQL**: connection pooling via PgBouncer if > 100 concurrent users
- **Media uploads**: always go to S3, never stored on disk in production
