# Docker Compose 部署

## 1) 准备环境变量

```bash
cp .env.docker.template .env.docker
```

按需修改 `.env.docker` 中的值（尤其是 `NEXTAUTH_SECRET`）。

> 说明：当前仓库没有 `prisma/migrations/`，所以默认用 `PRISMA_DB_PUSH=true` 在启动时自动执行 `prisma db push`。

## 2) 启动

```bash
docker compose --env-file .env.docker up --build
```

打开 `http://localhost:3000`。

## 3) 常用操作

查看日志：

```bash
docker compose logs -f app
```

停止：

```bash
docker compose down
```

清理数据卷（会删除 Postgres/Redis 数据）：

```bash
docker compose down -v
```

