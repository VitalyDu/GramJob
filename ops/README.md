# Ops — операционные скрипты для VPS

## PostgreSQL backup

Ежедневный `pg_dump` с локальной ротацией. Не защищает от потери VPS —
для offsite копий добавить upload в R2 (см. `docs/sprint-plan.md`).

### Установка на backend VPS

```bash
# 1. Разложить скрипт и env
sudo mkdir -p /opt/gramjob/ops
sudo cp ops/pg-backup.sh /opt/gramjob/ops/
sudo chmod +x /opt/gramjob/ops/pg-backup.sh
sudo cp ops/pg-backup.env.example /etc/gramjob-backup.env
sudo chmod 600 /etc/gramjob-backup.env
sudo nano /etc/gramjob-backup.env   # заполнить DATABASE_PASSWORD

# 2. Проверить, что pg_dump доступен и запуск проходит
sudo /opt/gramjob/ops/pg-backup.sh
ls -la /var/backups/gramjob/

# 3. Установить cron (запуск в 03:15 UTC каждый день)
sudo cp ops/pg-backup.cron /etc/cron.d/gramjob-backup
sudo chmod 644 /etc/cron.d/gramjob-backup
sudo systemctl restart cron
```

### Восстановление из бэкапа

```bash
gunzip -c /var/backups/gramjob/gramjob-YYYY-MM-DD.sql.gz \
  | psql -h localhost -U strapi -d strapi
```

### Мониторинг

Логи — в `/var/log/gramjob-backup.log`. Одна строка на прогон:

```
2026-07-18T03:15:04Z backup start database=strapi target=...
2026-07-18T03:15:12Z backup ok file=... size=52428800B
2026-07-18T03:15:12Z rotation deleted=1 retention=7d
```

Быстрая проверка последних 5 прогонов:

```bash
grep 'backup ok\|backup FAILED' /var/log/gramjob-backup.log | tail -5
```
