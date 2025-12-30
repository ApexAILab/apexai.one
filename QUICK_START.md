# 🚀 快速开始指南

## ✅ 数据库迁移已完成

数据库已经成功迁移到新的 Credentials Auth 系统！

## 下一步操作

### 1. 启动开发服务器

```bash
npm run dev
```

### 2. 创建第一个用户账号

1. 访问注册页面：`http://localhost:3000/auth/register`
2. 填写以下信息：
   - **用户名**：3-20个字符，只能包含字母、数字和下划线（例如：`admin`）
   - **密码**：至少6个字符（例如：`password123`）
   - **显示名称**（可选）：你的昵称
3. 点击"注册"按钮

### 3. 登录并使用

1. 注册成功后会自动跳转到 SecondBrain 页面
2. 或者访问登录页面：`http://localhost:3000/auth/signin`
3. 使用刚才注册的用户名和密码登录

### 4. 测试功能

- ✅ **登录/注册**：验证认证系统是否正常工作
- ✅ **SecondBrain**：创建、编辑、删除帖子
- ✅ **数据隔离**：不同用户只能看到自己的帖子
- ✅ **标签系统**：为帖子添加标签
- ✅ **搜索功能**：搜索帖子内容

## 🔒 安全提示

- 生产环境必须设置强随机的 `AUTH_SECRET`
- 密码使用 bcrypt 加密存储（10轮加密）
- JWT Token 存储在 HttpOnly Cookie 中
- 所有 API 请求都验证用户身份

## 📝 环境变量

确保 `.env` 文件包含：

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
AUTH_SECRET="运行 openssl rand -base64 32 生成"
```

## 🐛 遇到问题？

1. **无法登录**：检查 `AUTH_SECRET` 是否配置
2. **数据库错误**：运行 `npx prisma generate` 重新生成 Prisma Client
3. **迁移问题**：查看 `MIGRATION_GUIDE.md`

## 🎉 完成！

现在你可以开始使用 ApexAI 了！

