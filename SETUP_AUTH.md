# NextAuth.js 登录功能配置指南

## 📋 配置步骤

### 第一步：注册 Resend 账号

1. 访问 [Resend 官网](https://resend.com)
2. 注册账号（免费版每月可发送 3000 封邮件）
3. 进入 Dashboard，创建 API Key
4. 复制 API Key（格式：`re_xxxxxxxxxxxxx`）

### 第二步：验证域名（可选但推荐）

1. 在 Resend Dashboard 中添加你的域名
2. 按照提示添加 DNS 记录
3. 验证成功后，可以使用 `noreply@yourdomain.com` 作为发件地址
4. 如果暂时没有域名，可以使用 Resend 提供的测试域名（如 `onboarding@resend.dev`）

### 第三步：配置环境变量

在项目根目录的 `.env` 文件中添加以下配置：

```env
# 数据库连接（已有）
DATABASE_URL="postgresql://user:password@localhost:5432/apexai"
DIRECT_URL="postgresql://user:password@localhost:5432/apexai"

# NextAuth.js 配置（必需）
AUTH_SECRET="your-secret-key-here"  # 见下方生成方法
AUTH_URL="http://localhost:3000"    # 开发环境

# Resend 邮件服务（必需）
RESEND_API_KEY="re_xxxxxxxxxxxxx"   # 从 Resend Dashboard 复制
EMAIL_FROM="noreply@yourdomain.com" # 使用验证过的域名，或 "onboarding@resend.dev"
```

**生成 AUTH_SECRET：**

在终端运行以下命令生成一个安全的密钥：

```bash
openssl rand -base64 32
```

将生成的字符串复制到 `.env` 文件的 `AUTH_SECRET` 中。

### 第四步：运行数据库迁移

配置好环境变量后，运行 Prisma 迁移来创建认证相关的数据表：

```bash
npx prisma migrate dev --name add_auth_tables
```

这将创建以下表：
- `users` - 用户表
- `accounts` - 账户关联表（用于 OAuth）
- `sessions` - 会话表
- `verification_tokens` - 邮件验证令牌表

### 第五步：重启开发服务器

```bash
npm run dev
```

## 🧪 测试登录功能

1. 访问 `http://localhost:3000`
2. 点击右上角的"登录"按钮
3. 输入你的邮箱地址
4. 点击"发送登录链接"
5. 检查邮箱（包括垃圾邮件文件夹）
6. 点击邮件中的登录链接
7. 应该会自动登录并跳转回首页

## 🔒 路由保护

- `/secondbrain` 页面已受保护，未登录用户访问会自动跳转到登录页
- 登录后可以正常访问所有页面

## 🚀 生产环境配置

部署到生产环境时，需要：

1. **更新环境变量**：
   - `AUTH_URL` 改为实际域名（如 `https://yourdomain.com`）
   - `AUTH_SECRET` 使用新的密钥（不要使用开发环境的密钥）
   - `RESEND_API_KEY` 和 `EMAIL_FROM` 保持不变

2. **在部署平台配置环境变量**：
   - Vercel: 在项目设置 → Environment Variables 中添加
   - 其他平台: 按照平台文档配置

3. **运行数据库迁移**：
   ```bash
   npx prisma migrate deploy
   ```

## ❓ 常见问题

### Q: 收不到登录邮件？
A: 
1. 检查垃圾邮件文件夹
2. 确认 `RESEND_API_KEY` 和 `EMAIL_FROM` 配置正确
3. 检查 Resend Dashboard 中的邮件发送日志
4. 确认域名已通过验证（如果使用自定义域名）

### Q: 登录后还是无法访问 secondbrain？
A:
1. 检查浏览器控制台是否有错误
2. 确认 `AUTH_SECRET` 已正确配置
3. 清除浏览器缓存和 Cookie，重新登录

### Q: 如何添加更多用户？
A:
- 目前使用 Email 登录，任何邮箱都可以注册
- 首次使用某个邮箱登录时，系统会自动创建账户
- 未来可以添加管理员功能来管理用户

## 📚 相关文档

- [NextAuth.js 文档](https://authjs.dev)
- [Resend 文档](https://resend.com/docs)
- [Prisma 文档](https://www.prisma.io/docs)

