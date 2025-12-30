# AUTH_URL 详细说明

## 🤔 AUTH_URL 是什么？

`AUTH_URL` 告诉 NextAuth.js：**你的网站运行在哪个地址**。

### 它的作用：

1. **生成登录链接**：当你输入邮箱登录时，NextAuth.js 会生成一个登录链接，这个链接需要指向你的网站地址
2. **回调处理**：用户点击邮件中的链接后，NextAuth.js 需要知道跳转回哪个地址
3. **Session 管理**：确保登录状态在正确的域名下生效

---

## 📍 开发环境 vs 生产环境

### ❌ 重要：不能用同一个值！

**开发环境（本地）：**
```env
AUTH_URL="http://localhost:3000"
```
- 这是你本地开发时访问的地址
- 只有你的电脑能访问

**生产环境（部署后）：**
```env
AUTH_URL="https://你的实际域名"
```
- 这是部署后，所有人访问的地址
- 必须使用 `https://`（不是 `http://`）

---

## 🚀 如何填写生产环境的 AUTH_URL？

### 情况 1：部署到 Vercel（最常见）

**步骤：**

1. **推送代码到 GitHub**
   ```bash
   git push origin main
   ```

2. **在 Vercel 中查看你的域名**
   - 登录 Vercel Dashboard
   - 进入你的项目
   - 查看 "Domains" 或 "Deployments"
   - 你会看到类似：`apexai-xxx.vercel.app` 或 `yourdomain.com`

3. **填写 AUTH_URL**
   
   **如果使用 Vercel 提供的域名：**
   ```env
   AUTH_URL="https://apexai-xxx.vercel.app"
   ```
   - 将 `apexai-xxx.vercel.app` 替换为你的实际域名
   
   **如果使用自定义域名：**
   ```env
   AUTH_URL="https://yourdomain.com"
   ```
   - 将 `yourdomain.com` 替换为你的实际域名

4. **在 Vercel 中配置环境变量**
   - 进入项目设置 → Environment Variables
   - 添加 `AUTH_URL`，值为 `https://你的域名`
   - 选择环境：**Production**（生产环境）
   - 保存并重新部署

---

### 情况 2：部署到其他平台

**Netlify：**
```env
AUTH_URL="https://your-app.netlify.app"
```

**Railway：**
```env
AUTH_URL="https://your-app.railway.app"
```

**自定义服务器：**
```env
AUTH_URL="https://yourdomain.com"
```

---

## 📋 完整配置示例

### 本地开发（.env 文件）

```env
# 开发环境
AUTH_URL="http://localhost:3000"
AUTH_SECRET="开发环境的密钥"
RESEND_API_KEY="你的密钥"
EMAIL_FROM="onboarding@resend.dev"
```

### 生产环境（Vercel 环境变量）

在 Vercel Dashboard 中配置：

```
AUTH_URL = https://apexai-xxx.vercel.app
AUTH_SECRET = 生产环境的密钥（与开发环境不同）
RESEND_API_KEY = 你的密钥（与开发环境相同）
EMAIL_FROM = onboarding@resend.dev（或验证过的域名）
```

**重要：**
- ✅ 生产环境的 `AUTH_SECRET` 应该与开发环境**不同**（更安全）
- ✅ `RESEND_API_KEY` 和 `EMAIL_FROM` 可以相同
- ✅ `AUTH_URL` 必须使用 `https://`（不是 `http://`）

---

## 🔍 如何找到你的生产环境 URL？

### 方法 1：查看 Vercel Dashboard

1. 登录 https://vercel.com
2. 进入你的项目
3. 查看 "Domains" 标签页
4. 你会看到类似：
   - `apexai-xxx.vercel.app`（Vercel 提供的）
   - `yourdomain.com`（自定义域名，如果配置了）

### 方法 2：查看部署日志

1. 在 Vercel Dashboard 中，点击最新的部署
2. 查看部署详情，通常会显示访问地址

### 方法 3：查看浏览器地址栏

1. 访问你部署的网站
2. 查看浏览器地址栏的 URL
3. 这就是你的 `AUTH_URL`（去掉路径，只保留域名部分）

**例如：**
- 如果访问地址是：`https://apexai-xxx.vercel.app/secondbrain`
- 那么 `AUTH_URL` 应该是：`https://apexai-xxx.vercel.app`

---

## ✅ 检查清单

配置生产环境时，确认：

- [ ] `AUTH_URL` 使用 `https://`（不是 `http://`）
- [ ] `AUTH_URL` 的域名与实际访问的域名一致
- [ ] 在 Vercel 的环境变量中配置了 `AUTH_URL`
- [ ] 选择了正确的环境（Production）
- [ ] 重新部署了应用

---

## 🧪 测试

配置完成后：

1. 访问你的生产环境网站
2. 点击"登录"按钮
3. 输入邮箱
4. 检查收到的邮件
5. 邮件中的登录链接应该指向你的生产环境域名

如果链接指向 `localhost:3000`，说明 `AUTH_URL` 配置错误。

---

## ❓ 常见问题

**Q: 我可以开发和生产用同一个 AUTH_URL 吗？**
A: 不可以。开发环境用 `http://localhost:3000`，生产环境用实际的域名。

**Q: 为什么必须用 https？**
A: 生产环境必须使用 HTTPS 保证安全性，而且很多浏览器功能（如 Cookie）在 HTTPS 下才能正常工作。

**Q: 我还没有部署，现在应该填什么？**
A: 现在先填 `http://localhost:3000`，等部署后再在 Vercel 中配置生产环境的 `AUTH_URL`。

**Q: 部署后需要修改代码吗？**
A: 不需要。只需要在 Vercel 的环境变量中配置 `AUTH_URL`，不需要改代码。

