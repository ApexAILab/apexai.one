# 认证系统迁移指南

## 概述

本次重构将认证系统从 NextAuth.js + Email 登录改为 Credentials Auth（用户名/密码登录）。

## ⚠️ 重要提示

**这是一个破坏性迁移！** 迁移会：
- 删除 NextAuth.js 相关的表（Account, Session, VerificationToken）
- 修改 User 表结构（添加 username 和 password 字段，移除 email 相关字段）
- 修改 Post 表结构（添加 userId 字段，实现数据隔离）

**如果数据库中有现有数据，请先备份！**

## 迁移步骤

### 1. 备份数据库（重要！）

```bash
# 使用 pg_dump 备份 PostgreSQL 数据库
pg_dump -U your_username -d apexai > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 处理现有数据

**重要：** 由于这是一个破坏性迁移，你需要决定如何处理现有数据：

- **选项 A（推荐）**: 如果这是开发环境或可以清空数据，直接删除所有表并重新创建
- **选项 B**: 如果需要保留 Post 数据，需要手动迁移（见下方说明）

### 3. 运行数据库迁移

#### 选项 A：清空数据库后迁移（推荐用于开发环境）

```bash
# 1. 删除所有表（谨慎操作！）
# 可以通过 Prisma Studio 或直接连接数据库执行：
# DROP SCHEMA public CASCADE;
# CREATE SCHEMA public;

# 2. 运行迁移
npx prisma migrate dev --name credentials_auth
```

#### 选项 B：保留数据的手动迁移

1. 查看 `prisma/migrations/manual_migration.sql` 文件
2. 根据你的数据情况修改脚本
3. 手动执行 SQL 脚本
4. 运行 `npx prisma generate` 重新生成 Prisma Client

### 3. 验证迁移结果

迁移完成后，数据库应该包含以下表：
- `users` - 用户表（包含 username, password 字段）
- `posts` - 帖子表（包含 userId 字段，关联到 users）
- `conversations` - 对话表

### 4. 创建第一个用户

迁移完成后，你需要通过注册页面创建第一个用户账号：

1. 访问 `http://localhost:3000/auth/register`
2. 填写用户名、密码等信息
3. 完成注册后即可登录使用

## 环境变量更新

确保 `.env` 文件中包含：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/apexai"
DIRECT_URL="postgresql://user:password@localhost:5432/apexai"
AUTH_SECRET="your-secret-key-here"  # 运行 openssl rand -base64 32 生成
```

**注意：** 不再需要 `RESEND_API_KEY` 和 `EMAIL_FROM` 等邮件服务配置。

## 数据迁移（可选）

如果你有现有的用户数据需要迁移，可以：

1. 从备份中提取用户邮箱
2. 手动创建对应的用户账号（用户名可以使用邮箱前缀或自定义）
3. 如果 Post 数据需要关联到新用户，需要手动更新 `userId` 字段

## 回滚（如果需要）

如果需要回滚到 NextAuth.js 系统：

1. 恢复数据库备份
2. 恢复 `auth.ts` 和 `auth-edge.ts` 文件
3. 恢复 Prisma schema 到之前的版本
4. 重新安装 NextAuth.js 相关依赖

## 常见问题

### Q: 迁移后无法登录？
A: 这是正常的，因为旧的 NextAuth.js 用户数据已被删除。请通过注册页面创建新账号。

### Q: 旧的 Post 数据会丢失吗？
A: 不会，但需要手动关联到新用户。如果 Post 表中有数据但没有 userId，需要手动更新。

### Q: 可以保留邮箱登录功能吗？
A: 当前实现只支持用户名/密码登录。如果需要邮箱登录，可以后续扩展认证系统。

