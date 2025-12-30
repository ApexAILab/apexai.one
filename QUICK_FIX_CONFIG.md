# 🔧 快速修复 "Configuration" 错误

## 问题
登录时出现 "Configuration" 错误，说明 NextAuth.js 的必需环境变量未配置。

## ✅ 快速解决步骤

### 1. 检查当前配置

访问调试页面查看配置状态：
```
http://localhost:3000/api/auth/debug
```

### 2. 配置环境变量

在项目根目录的 `.env` 文件中添加以下内容：

```env
# NextAuth.js 必需配置
AUTH_SECRET="r8HKN480I7jtJimwsQP9w4eHF9EO8pHW80JbYQ80Zxc="
AUTH_URL="http://localhost:3000"

# Resend 邮件服务
RESEND_API_KEY="re_你的实际密钥"
EMAIL_FROM="onboarding@resend.dev"
```

### 3. 说明

- **AUTH_SECRET**: 已为你生成，直接复制上面的值
- **AUTH_URL**: 开发环境使用 `http://localhost:3000`
- **RESEND_API_KEY**: 从 [Resend Dashboard](https://resend.com) 获取
- **EMAIL_FROM**: 测试时使用 `onboarding@resend.dev`

### 4. 重启服务器

配置完成后，**必须重启开发服务器**：

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
npm run dev
```

### 5. 验证配置

再次访问调试页面，确认所有配置都显示 ✅：
```
http://localhost:3000/api/auth/debug
```

## ❓ 如果还是不行

1. **确认 .env 文件在项目根目录**（不是子文件夹）
2. **确认没有拼写错误**（注意大小写）
3. **确认值没有多余的空格或引号**
4. **重启开发服务器**

## 📝 完整的 .env 文件示例

```env
# 数据库（如果已有，保持不变）
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# NextAuth.js 配置（必需）
AUTH_SECRET="r8HKN480I7jtJimwsQP9w4eHF9EO8pHW80JbYQ80Zxc="
AUTH_URL="http://localhost:3000"

# Resend 邮件服务（必需）
RESEND_API_KEY="re_你的实际密钥"
EMAIL_FROM="onboarding@resend.dev"
```

