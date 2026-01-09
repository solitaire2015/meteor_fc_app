# Vercel Preview（pre）环境配置

目标：在 Vercel 的 **Preview** 环境跑一套“和生产隔离的数据”，但 **共用同一个 Postgres 实例** 和 **同一个 Redis 实例**。

## 1) 约定命名

- Postgres schema：推荐用 `pre_` + 生产数据库名，例如生产是 `meteordb`，则 Preview 用 `pre_meteordb`（或你说的 `db1`，只要不一样即可）。
- Redis DB：用不同的逻辑 DB index，例如生产用默认 `0`，Preview 用 `1`。

## 2) Vercel 里需要配哪些环境变量（Preview）

在 Vercel Project → Settings → Environment Variables：

- 把 Production 的变量 **复制一份到 Preview**（Environment 选择 Preview）
- 然后只改下面这些：

**Postgres / Prisma**

- `DATABASE_URL`: 在原来的 URL 末尾加上 `?schema=pre_meteordb`
  - 例：`postgresql://.../meteordb?schema=pre_meteordb`
- `DIRECT_URL`: 同样建议加上 `?schema=pre_meteordb`（如果你有在用它）

**Redis**

- 推荐加：`REDIS_DB=1`
  - 也可以直接在 `REDIS_URL` 里写 `/1`，例如 `redis://default:***@host:6379/1`

**NextAuth / 域名**

- Preview 环境通常可以不设置 `NEXTAUTH_URL`（让 NextAuth 根据请求自动推断）
- 如果你想固定某个域名，再设置 `NEXTAUTH_URL` 为那个 Preview 域名即可

`.env.preview.template` 里有一份可参考的变量清单（注意 Next.js 不会自动加载 `.env.preview`，Vercel 需要在控制台配置）。

## 3) 在数据库里创建 Preview schema（一次性）

Prisma 的 `?schema=...` 只对 Prisma 生效；你用 `psql` 时请连接“没有 `?schema=` 的基础连接串”，然后手动建 schema：

```sql
CREATE SCHEMA IF NOT EXISTS pre_meteordb;
```

## 4) 初始化 Preview schema 的表结构

这个项目当前没有提交 Prisma migrations，建议用 `db push` 建表：

```bash
# 注意：这里的连接串要带上 ?schema=pre_meteordb
export DATABASE_URL='postgresql://.../meteordb?schema=pre_meteordb'
npx prisma db push
```

如果你更希望用迁移（migrations）来管理结构，需要先在仓库里建立 migration 流程再部署。

## 5) 把生产数据拷贝到 Preview schema（可行）

可行，但你需要在数据库侧执行一次数据复制（建议在低峰期做，并确认不会覆盖你想保留的 Preview 数据）。

一种简单办法是在 `psql` 里（连到同一个 database）跑下面的“按表复制”脚本：

```sql
BEGIN;

-- 复制数据前，确保 pre_meteordb 里已经有同结构的表（先跑 prisma db push）
SET session_replication_role = replica;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('INSERT INTO pre_meteordb.%I SELECT * FROM public.%I;', r.tablename, r.tablename);
  END LOOP;
END $$;

SET session_replication_role = origin;
COMMIT;
```

说明：
- 这会把 `public` schema 的所有表数据复制到 `pre_meteordb`。
- 如果 Preview 里已经有数据，可能会主键/唯一键冲突；需要先 `TRUNCATE pre_meteordb.<table> CASCADE;` 再复制，或只复制部分表。

## 6) Preview 域名（可选）

- 没有自定义域名也没关系：Vercel 每次 Preview 部署都会有一个 `*.vercel.app` 的访问地址。
- 如果你希望“固定一个 Preview 域名”，可以在 Vercel 里加一个域名（或通配符域名）并绑定到 Preview。

## 7) Google API Key

Google API Key 可以和生产共用（按你需求）；如果你担心配额/风控，建议单独给 Preview 一份 key。
