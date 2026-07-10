# Sprint 1 DevOps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Настроить монорепо-инфраструктуру с Docker Compose для локальных сервисов, шаблонами переменных окружения, pre-commit хуками и CI/CD pipeline.

**Architecture:** Корневой pnpm workspace с двумя пакетами (`backend/` — Strapi 5, `frontend/` — Next.js 15). Docker Compose поднимает PostgreSQL 16 и MinIO локально. Husky+lint-staged обеспечивают pre-commit проверки. GitHub Actions запускает CI на каждый PR.

**Tech Stack:** pnpm 9, Husky 9, lint-staged 15, Prettier 3, Docker Compose v2, GitHub Actions

---

## Файловая карта

```
gramjob/
├── .git/                          # Task 1
├── .gitignore                     # Task 1
├── package.json                   # Task 1 — root pnpm workspace
├── pnpm-workspace.yaml            # Task 1
├── backend/
│   ├── package.json               # Task 1 — placeholder, заменится при init Strapi
│   └── .env.example               # Task 3
├── frontend/
│   ├── package.json               # Task 1 — placeholder, заменится при init Next.js
│   └── .env.example               # Task 3
├── docker-compose.yml             # Task 2
├── .prettierrc                    # Task 4
├── .prettierignore                # Task 4
├── .lintstagedrc.json             # Task 4
├── .husky/
│   └── pre-commit                 # Task 4
└── .github/
    └── workflows/
        └── ci.yml                 # Task 5
```

---

## Task 1: Git Init + Monorepo Scaffold

**Files:**

- Create: `.gitignore`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `backend/package.json` (placeholder)
- Create: `frontend/package.json` (placeholder)

- [ ] **Step 1: Инициализировать git репозиторий**

```bash
cd /Users/vitaly/work/GramJob
git init
```

Ожидаемый вывод: `Initialized empty Git repository in .../GramJob/.git/`

- [ ] **Step 2: Создать `.gitignore`**

Создать файл `/Users/vitaly/work/GramJob/.gitignore`:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment variables (never commit real .env)
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
.next/
out/

# Strapi
.strapi/
.tmp/
.cache/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Editor
.idea/
.vscode/
*.swp
*.swo

# Test coverage
coverage/
.nyc_output/

# Docker volumes (локальные данные)
postgres_data/
minio_data/
```

- [ ] **Step 3: Создать корневой `package.json`**

Создать файл `/Users/vitaly/work/GramJob/package.json`:

```json
{
  "name": "gramjob",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "prepare": "husky",
    "lint": "pnpm -r --if-present run lint",
    "typecheck": "pnpm -r --if-present run typecheck",
    "test": "pnpm -r --if-present run test",
    "dev:backend": "pnpm --filter backend run develop",
    "dev:frontend": "pnpm --filter frontend run dev"
  },
  "devDependencies": {
    "husky": "^9.1.7",
    "lint-staged": "^15.2.10",
    "prettier": "^3.3.3"
  }
}
```

- [ ] **Step 4: Создать `pnpm-workspace.yaml`**

Создать файл `/Users/vitaly/work/GramJob/pnpm-workspace.yaml`:

```yaml
packages:
  - 'frontend'
  - 'backend'
```

- [ ] **Step 5: Создать placeholder `backend/package.json`**

Создать файл `/Users/vitaly/work/GramJob/backend/package.json`:

```json
{
  "name": "backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "develop": "strapi develop",
    "start": "strapi start",
    "build": "strapi build",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  }
}
```

> **Примечание:** Этот файл будет перезаписан при `pnpm create strapi@latest` в Sprint 1 Backend. Он нужен сейчас, чтобы pnpm workspace распознал пакет.

- [ ] **Step 6: Создать placeholder `frontend/package.json`**

Создать файл `/Users/vitaly/work/GramJob/frontend/package.json`:

```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

> **Примечание:** Этот файл будет перезаписан при `create-next-app` в Sprint 1 Frontend.

- [ ] **Step 7: Установить зависимости**

```bash
cd /Users/vitaly/work/GramJob
pnpm install
```

Ожидаемый вывод: husky, lint-staged, prettier установлены в `node_modules/`.

- [ ] **Step 8: Проверить структуру**

```bash
ls -la
# Должны быть: .gitignore, package.json, pnpm-workspace.yaml,
#              backend/, frontend/, node_modules/, pnpm-lock.yaml
```

- [ ] **Step 9: Первый коммит**

```bash
git add .gitignore package.json pnpm-workspace.yaml pnpm-lock.yaml backend/package.json frontend/package.json CLAUDE.md docs/ .claude/
git commit -m "chore: initialize monorepo with pnpm workspaces"
```

---

## Task 2: Docker Compose — PostgreSQL 16 + MinIO

**Files:**

- Create: `docker-compose.yml`

- [ ] **Step 1: Создать `docker-compose.yml`**

Создать файл `/Users/vitaly/work/GramJob/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: gramjob_postgres
    environment:
      POSTGRES_USER: gramjob
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: gramjob
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U gramjob -d gramjob']
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: gramjob_minio
    command: server /data --console-address ':9001'
    environment:
      MINIO_ROOT_USER: gramjob
      MINIO_ROOT_PASSWORD: secret123
    ports:
      - '9000:9000' # S3 API
      - '9001:9001' # Web Console
    volumes:
      - minio_data:/data
    healthcheck:
      test: ['CMD', 'mc', 'ready', 'local']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  minio_data:
```

- [ ] **Step 2: Запустить сервисы**

```bash
docker compose up -d
```

Ожидаемый вывод:

```
✔ Container gramjob_postgres  Started
✔ Container gramjob_minio     Started
```

- [ ] **Step 3: Проверить PostgreSQL**

```bash
docker exec gramjob_postgres pg_isready -U gramjob -d gramjob
```

Ожидаемый вывод: `localhost:5432 - accepting connections`

- [ ] **Step 4: Проверить MinIO**

```bash
docker ps | grep minio
# Status должен быть: Up ... (healthy)
```

Открыть в браузере: http://localhost:9001 — должна открыться MinIO Console.  
Логин: `gramjob` / Пароль: `secret123`

- [ ] **Step 5: Остановить сервисы (не удаляя данные)**

```bash
docker compose stop
```

- [ ] **Step 6: Коммит**

```bash
git add docker-compose.yml
git commit -m "chore: add Docker Compose with PostgreSQL 16 and MinIO"
```

---

## Task 3: Environment Variables (.env.example)

**Files:**

- Create: `backend/.env.example`
- Create: `frontend/.env.example`

- [ ] **Step 1: Создать `backend/.env.example`**

Создать файл `/Users/vitaly/work/GramJob/backend/.env.example`:

```env
# ============================================
# DATABASE
# ============================================
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=gramjob
DATABASE_USERNAME=gramjob
DATABASE_PASSWORD=secret
DATABASE_SSL=false

# ============================================
# STRAPI SECRETS
# Генерировать командой: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# ============================================
APP_KEYS=key1,key2,key3,key4
API_TOKEN_SALT=changeme
ADMIN_JWT_SECRET=changeme
TRANSFER_TOKEN_SALT=changeme
JWT_SECRET=changeme

# ============================================
# S3 STORAGE (MinIO local)
# ============================================
S3_ACCESS_KEY_ID=gramjob
S3_SECRET_ACCESS_KEY=secret123
S3_REGION=us-east-1
S3_BUCKET=gramjob
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true

# ============================================
# TELEGRAM
# ============================================
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=GramJobBot
TELEGRAM_WEBHOOK_URL=https://api.gramjob.com/telegram/webhook

# ============================================
# APP
# ============================================
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
HOST=0.0.0.0
PORT=1337
```

- [ ] **Step 2: Создать `frontend/.env.example`**

Создать файл `/Users/vitaly/work/GramJob/frontend/.env.example`:

```env
# ============================================
# API
# ============================================
NEXT_PUBLIC_API_URL=http://localhost:1337/api
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337

# ============================================
# TELEGRAM
# ============================================
NEXT_PUBLIC_BOT_USERNAME=GramJobBot
NEXT_PUBLIC_MINI_APP_URL=https://t.me/GramJobBot/app

# ============================================
# AUTH (Next.js)
# ============================================
NEXTAUTH_SECRET=changeme
NEXTAUTH_URL=http://localhost:3000
```

- [ ] **Step 3: Коммит**

```bash
git add backend/.env.example frontend/.env.example
git commit -m "chore: add .env.example files for backend and frontend"
```

---

## Task 4: Pre-commit Hooks (Prettier + ESLint + TypeScript)

**Files:**

- Create: `.prettierrc`
- Create: `.prettierignore`
- Create: `.lintstagedrc.json`
- Modify: `.husky/pre-commit` (создаётся командой husky)

- [ ] **Step 1: Инициализировать Husky**

```bash
cd /Users/vitaly/work/GramJob
pnpm exec husky init
```

Ожидаемый результат: создаётся файл `.husky/pre-commit` с содержимым `npm test`.

- [ ] **Step 2: Создать `.prettierrc`**

Создать файл `/Users/vitaly/work/GramJob/.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf"
}
```

- [ ] **Step 3: Создать `.prettierignore`**

Создать файл `/Users/vitaly/work/GramJob/.prettierignore`:

```
node_modules/
.next/
dist/
build/
.strapi/
pnpm-lock.yaml
*.min.js
public/
```

- [ ] **Step 4: Создать `.lintstagedrc.json`**

Конфигурация lint-staged: prettier запускается на всех поддерживаемых файлах, ESLint и typecheck делегируются воркспейсам через их собственные скрипты.

Создать файл `/Users/vitaly/work/GramJob/.lintstagedrc.json`:

```json
{
  "*.{js,jsx,ts,tsx}": ["prettier --write"],
  "*.{json,md,yaml,yml,css,scss}": ["prettier --write"],
  "frontend/**/*.{ts,tsx}": ["bash -c 'cd frontend && pnpm exec eslint --fix \"$@\"' --"],
  "backend/**/*.ts": ["bash -c 'cd backend && pnpm exec eslint --fix \"$@\"' --"]
}
```

> **Примечание:** ESLint-шаги начнут работать, когда ESLint будет установлен в соответствующих воркспейсах (Sprint 1 Backend и Sprint 1 Frontend).

- [ ] **Step 5: Настроить pre-commit хук**

Перезаписать файл `/Users/vitaly/work/GramJob/.husky/pre-commit`:

```sh
#!/bin/sh
pnpm exec lint-staged
```

- [ ] **Step 6: Проверить что хук работает**

Сделать любое изменение в файле (например, добавить пробел в README):

```bash
echo " " >> .gitignore
git add .gitignore
git commit -m "test: check pre-commit hook"
```

Ожидаемый вывод: lint-staged запустится, prettier исправит форматирование, коммит пройдёт.

После проверки — отменить тестовый коммит:

```bash
git reset --soft HEAD~1
git checkout .gitignore
```

- [ ] **Step 7: Коммит**

```bash
git add .prettierrc .prettierignore .lintstagedrc.json .husky/
git commit -m "chore: add pre-commit hooks with Husky and lint-staged"
```

---

## Task 5: GitHub Actions CI Pipeline

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Создать директорию**

```bash
mkdir -p /Users/vitaly/work/GramJob/.github/workflows
```

- [ ] **Step 2: Создать `.github/workflows/ci.yml`**

Создать файл `/Users/vitaly/work/GramJob/.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches:
      - main
      - develop
  push:
    branches:
      - main

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Prettier check
        run: pnpm exec prettier --check "**/*.{js,jsx,ts,tsx,json,md,yaml,yml,css}" --ignore-path .prettierignore

      - name: Lint (all workspaces)
        run: pnpm -r --if-present run lint

      - name: Type check (all workspaces)
        run: pnpm -r --if-present run typecheck

  test:
    name: Tests
    runs-on: ubuntu-latest
    needs: lint-and-typecheck

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: gramjob
          POSTGRES_PASSWORD: secret
          POSTGRES_DB: gramjob_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests (all workspaces)
        run: pnpm -r --if-present run test
        env:
          DATABASE_CLIENT: postgres
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_NAME: gramjob_test
          DATABASE_USERNAME: gramjob
          DATABASE_PASSWORD: secret
          NODE_ENV: test
```

- [ ] **Step 3: Проверить YAML синтаксис**

```bash
# Если установлен yamllint:
yamllint .github/workflows/ci.yml

# Или проверить структуру вручную:
cat .github/workflows/ci.yml
```

- [ ] **Step 4: Коммит**

```bash
git add .github/
git commit -m "ci: add GitHub Actions CI pipeline (lint, typecheck, tests)"
```

---

## Проверка завершения

После выполнения всех задач:

```bash
# Структура файлов
ls -la
# Ожидаемо: .git/, .gitignore, .github/, .husky/, .lintstagedrc.json,
#           .prettierignore, .prettierrc, CLAUDE.md, backend/, docs/,
#           docker-compose.yml, frontend/, node_modules/, package.json,
#           pnpm-lock.yaml, pnpm-workspace.yaml

# Docker Compose работает
docker compose up -d
docker compose ps
# Ожидаемо: оба сервиса Up

# Git лог
git log --oneline
# Ожидаемо: 4 коммита (scaffold, docker, env, hooks, ci)
```

---

## Checklist задач Sprint 1 DevOps

- [ ] Монорепо инициализировано (git init + pnpm workspaces)
- [ ] Docker Compose: PostgreSQL 16 + MinIO запускаются через `docker compose up -d`
- [ ] `backend/.env.example` содержит все переменные backend
- [ ] `frontend/.env.example` содержит все переменные frontend
- [ ] Pre-commit хук запускает prettier при коммите
- [ ] GitHub Actions CI запускается на каждый PR к main/develop
