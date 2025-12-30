# 环境变量配置详细指南

## 📝 四个必需的环境变量说明

### 1. AUTH_SECRET（必需）

**作用：**
- 用于加密和签名 NextAuth.js 的 session token（会话令牌）
- 保证登录状态的安全性
- **非常重要**：如果泄露，攻击者可能伪造登录状态

**如何填写：**
- 我已经为你生成了一个安全的密钥：`fwF4pozWME9HUMOSo4rg71w4+WFQHyl/t1d/hOWoxMc=`
- 直接复制这个值到 `.env` 文件中即可

**格式：**
```env
AUTH_SECRET="fwF4pozWME9HUMOSo4rg71w4+WFQHyl/t1d/hOWoxMc="
```

**注意：**
- 开发环境和生产环境应该使用不同的密钥
- 不要把这个密钥提交到 Git（`.env` 文件已经在 `.gitignore` 中）

---

### 2. AUTH_URL（必需）

**作用：**
- 告诉 NextAuth.js 你的应用运行在哪个地址
- 用于生成登录链接和回调 URL

**如何填写：**

**开发环境（本地）：**
```env
AUTH_URL="http://localhost:3000"
```

**生产环境（部署后）：**
```env
AUTH_URL="https://yourdomain.com"
```
- 将 `yourdomain.com` 替换为你的实际域名
- 例如：`AUTH_URL="https://apexai.vercel.app"`

**当前填写：**
- 如果你在本地开发，填写：`AUTH_URL="http://localhost:3000"`

---

### 3. RESEND_API_KEY（必需）

**作用：**
- Resend 邮件服务的 API 密钥
- 用于发送登录邮件

**如何填写：**
- 你已经有了这个密钥，直接复制到 `.env` 文件中
- 格式通常是：`re_xxxxxxxxxxxxx`

**格式：**
```env
RESEND_API_KEY="re_你的实际密钥"
```

**获取位置：**
- Resend Dashboard → API Keys → 复制你的密钥

---

### 4. EMAIL_FROM（必需）

**作用：**
- 登录邮件的发件人地址
- 用户收到的邮件会显示这个地址

**如何填写：**

**选项 1：使用 Resend 测试域名（最简单，推荐新手）**
```env
EMAIL_FROM="onboarding@resend.dev"
```
- ✅ 无需验证域名
- ✅ 可以直接使用
- ⚠️ 但邮件可能进入垃圾箱

**选项 2：使用验证过的域名（推荐生产环境）**
```env
EMAIL_FROM="noreply@yourdomain.com"
```
- ✅ 更专业
- ✅ 邮件送达率更高
- ⚠️ 需要先在 Resend 中验证域名

**如何验证域名：**
1. 登录 Resend Dashboard
2. 进入 "Domains" 页面
3. 点击 "Add Domain"
4. 输入你的域名（如 `yourdomain.com`）
5. 按照提示添加 DNS 记录
6. 验证成功后，可以使用 `noreply@yourdomain.com`

**当前建议：**
- 如果只是测试，先用：`EMAIL_FROM="onboarding@resend.dev"`
- 如果已经验证了域名，用：`EMAIL_FROM="noreply@你的域名"`

---

## 📋 完整的 .env 文件示例

将以下内容添加到项目根目录的 `.env` 文件中：

```env
# 数据库连接（如果还没有，需要添加）
DATABASE_URL="postgresql://user:password@localhost:5432/apexai"
DIRECT_URL="postgresql://user:password@localhost:5432/apexai"

# NextAuth.js 配置
AUTH_SECRET="fwF4pozWME9HUMOSo4rg71w4+WFQHyl/t1d/hOWoxMc="
AUTH_URL="http://localhost:3000"

# Resend 邮件服务
RESEND_API_KEY="re_你的实际密钥"
EMAIL_FROM="onboarding@resend.dev"
```

---

## ✅ 检查清单

配置完成后，确认：

- [ ] `AUTH_SECRET` 已填写（使用上面生成的密钥）
- [ ] `AUTH_URL` 已填写（开发环境用 `http://localhost:3000`）
- [ ] `RESEND_API_KEY` 已填写（你的实际密钥）
- [ ] `EMAIL_FROM` 已填写（测试用 `onboarding@resend.dev`）

---

## 🧪 测试配置

配置完成后，重启开发服务器：

```bash
npm run dev
```

然后访问 `http://localhost:3000`，点击"登录"按钮，输入邮箱测试是否能收到登录邮件。

---

## ❓ 常见问题

**Q: AUTH_SECRET 可以自己随便写吗？**
A: 不建议。应该使用随机生成的密钥，长度至少 32 字符。我已经为你生成了一个安全的密钥。

**Q: 开发和生产环境可以用同一个 AUTH_SECRET 吗？**
A: 不建议。应该使用不同的密钥，提高安全性。

**Q: EMAIL_FROM 必须验证域名吗？**
A: 不是必须的。使用 `onboarding@resend.dev` 可以直接使用，但验证域名后邮件送达率更高。

**Q: 收不到登录邮件怎么办？**
A: 
1. 检查垃圾邮件文件夹
2. 确认 `RESEND_API_KEY` 正确
3. 检查 Resend Dashboard 中的邮件发送日志
4. 确认 `EMAIL_FROM` 格式正确

