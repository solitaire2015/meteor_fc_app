# Docker Compose 部署

## 1) 准备环境变量

```bash
node scripts/generate-env-docker.mjs
```

会从 `.env.local` 复制第三方服务的变量（`RESEND_API_KEY`、`AWS_*`、`OPENAI_API_KEY/GOOGLE_API_KEY`、`AI_PROVIDER/AI_MODEL` 等），同时把 Database/Redis 指向 compose 内的 `postgres`/`redis`。

如需重新生成并覆盖已有 `.env.docker`：

```bash
node scripts/generate-env-docker.mjs --force
```

生成后你仍然可以按需修改 `.env.docker`（尤其是 `NEXTAUTH_SECRET`）。

说明：
- `docker compose --env-file .env.docker` 用来给 `docker-compose.yml` 做变量替换（比如端口、Postgres 初始化账号等）。
- `docker-compose.yml` 也会把 `.env.docker` 注入到 `app` 容器（通过 `env_file: .env.docker`），所以你可以把应用运行需要的环境变量都放在这里。

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
