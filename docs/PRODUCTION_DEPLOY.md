# 生产环境部署（EC2 + Docker Compose + SSM）

本文档描述如何把 `main` 分支的最新代码部署到生产环境。本地开发部署请看 [DOCKER_COMPOSE.md](./DOCKER_COMPOSE.md)。

## 1) 架构概览

生产环境运行在一台 AWS EC2 实例上，通过 `docker compose` 管理三个容器：

| 容器 | 镜像 | 说明 |
| --- | --- | --- |
| `meteor_fc_app-app-1` | `meteor_fc_app-app`（本地构建） | Next.js 应用，对外 `:3000` |
| `meteor_fc_app-postgres-1` | `postgres:16-alpine` | 数据库，数据卷 `/data/meteor_fc_app/postgres` |
| `meteor_fc_app-redis-1` | `redis:7-alpine` | 缓存，命名卷 `redis_data` |

关键信息：

| 项目 | 值 |
| --- | --- |
| Instance ID | `i-09903d31f27b7bf90` |
| Region | `ap-northeast-1` |
| 仓库路径 | `/home/programs/workspace/projects/meteor_fc_app` |
| 环境变量文件 | `.env.docker`（**仅此一个**，无默认 `.env`） |

> 应用镜像是从源码 `npm run build` 构建进镜像的（见 `Dockerfile`），所以**代码改动必须重新 build 镜像**，仅 `git pull` 不会生效。

## 2) 前置条件（本地机器）

- 安装 AWS CLI v2，且当前身份对该实例有 SSM 权限（`aws sts get-caller-identity` 可验证）。
- 已安装 Session Manager 插件（仅交互式 `start-session` 需要；非交互式 `send-command` 不需要）。
- 代码已合并进 `main` 并推送到 GitHub。

## 3) 部署步骤

### 关键注意点

1. **构建时必须带 `--env-file .env.docker`**。`docker-compose.yml` 的 `build.args`（`AWS_ACCESS_KEY_ID` 等）是通过变量替换注入的；生产机上**没有默认 `.env`**，若不指定 `--env-file`，这些构建参数会变成空值。
2. **只重建 `app` 容器**，不要动 `postgres` / `redis`，避免影响数据。
3. 旧容器在新镜像构建完成前会持续提供服务，`up -d app` 时才会切换，停机时间极短。
4. 当前仓库没有 `prisma/migrations/`，schema 变更靠启动时的 `PRISMA_DB_PUSH=true`（在 `docker/entrypoint.sh` 中执行 `prisma db push`）。普通代码改动无需关心。

### 方式 A：交互式（适合手动操作 / 排查）

```bash
# 1. 登录实例
aws ssm start-session --target i-09903d31f27b7bf90 --region ap-northeast-1

# 2. 进入项目目录
cd /home/programs/workspace/projects/meteor_fc_app

# 3. 拉取最新代码
git pull origin main

# 4. 重新构建应用镜像（务必带 --env-file）
docker compose --env-file .env.docker build app

# 5. 重建 app 容器（postgres/redis 不动）
docker compose --env-file .env.docker up -d app

# 6. 验证
docker ps --filter name=meteor_fc_app-app-1
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000
docker logs --tail 20 meteor_fc_app-app-1
```

### 方式 B：非交互式（适合脚本 / CI，无需 Session Manager 插件）

构建步骤耗时较长（约 3–4 分钟），用 `send-command` 下发并轮询：

```bash
# 拉取 + 构建
CMD_ID=$(aws ssm send-command \
  --region ap-northeast-1 \
  --instance-ids i-09903d31f27b7bf90 \
  --document-name "AWS-RunShellScript" \
  --timeout-seconds 3600 \
  --parameters 'executionTimeout=3600,commands=[
    "set -e",
    "cd /home/programs/workspace/projects/meteor_fc_app",
    "git pull origin main",
    "docker compose --env-file .env.docker build app > /tmp/meteor_build.log 2>&1 && echo BUILD_OK || (tail -40 /tmp/meteor_build.log; echo BUILD_FAILED; exit 1)"
  ]' \
  --query "Command.CommandId" --output text)

# 轮询状态（构建期间会一直 InProgress）
watch -n 20 "aws ssm get-command-invocation --region ap-northeast-1 \
  --command-id $CMD_ID --instance-id i-09903d31f27b7bf90 --query Status --output text"

# 构建成功后，重建容器并验证
aws ssm send-command \
  --region ap-northeast-1 \
  --instance-ids i-09903d31f27b7bf90 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=[
    "cd /home/programs/workspace/projects/meteor_fc_app",
    "docker compose --env-file .env.docker up -d app",
    "sleep 12",
    "docker ps --filter name=meteor_fc_app-app-1 --format \"{{.Status}}\"",
    "curl -s -o /dev/null -w \"HTTP %{http_code}\\n\" http://localhost:3000"
  ]' \
  --query "Command.CommandId" --output text
```

> `send-command` 的 `commands` 是被拼接成一个 shell 脚本执行的，**避免在 `echo` 等命令里使用未转义的圆括号 `()`**，否则会触发 `syntax error near unexpected token '('`。

## 4) 验证清单

- `docker ps` 中 `meteor_fc_app-app-1` 状态为 `Up`，`postgres`/`redis` 为 `healthy`。
- `curl http://localhost:3000` 返回 `HTTP 200`。
- 应用日志出现 `✓ Ready`。
- 验证本次改动确实生效（例如某个新接口）：
  ```bash
  curl -s "http://localhost:3000/api/leaderboard?type=appearances&year=2025" | head -c 200
  ```

## 5) 回滚

镜像构建是覆盖式的（`meteor_fc_app-app:latest`），没有保留旧 tag。回滚方式：

```bash
cd /home/programs/workspace/projects/meteor_fc_app
git checkout <上一个正常的 commit>
docker compose --env-file .env.docker build app
docker compose --env-file .env.docker up -d app
```

> 建议：如需更稳妥的回滚，可在每次部署前给当前镜像打标签（如 `docker tag meteor_fc_app-app:latest meteor_fc_app-app:backup-<date>`），失败时直接 `up -d` 回退到该 tag。

## 6) 常见问题

- **新代码没生效**：只 `git pull` 没重新 `build`；或 build 时漏了 `--env-file .env.docker` 导致 AWS 构建参数为空。
- **图片 / 上传相关功能异常**：检查 `.env.docker` 里的 `AWS_*` 是否正确（构建参数 + 运行时都依赖它）。
- **数据库连接失败**：确认未误删 `postgres` 容器或其数据卷 `/data/meteor_fc_app/postgres`；`docker compose down -v` 会删除数据，**生产环境禁止使用 `-v`**。
- **SSM 命令一直 InProgress**：属于正常现象，Next.js 构建通常 3–4 分钟，耐心轮询即可。
