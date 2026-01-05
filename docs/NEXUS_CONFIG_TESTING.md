# Nexus 配置数据测试指南

本指南帮助你在开发环境中测试 Nexus 配置数据是否正确保存到数据库。

## 📋 测试步骤

### 1. 确保已登录

访问 Nexus 页面需要先登录：
- 如果还没有账号，访问 `/auth/register` 注册
- 如果已有账号，访问 `/auth/signin` 登录

### 2. 访问 Nexus 页面

1. 访问 `http://localhost:3000/nexus`
2. 页面会自动从数据库加载配置（如果有的话）
3. 打开浏览器开发者工具（F12），查看 Console 标签页

### 3. 添加配置数据

#### 3.1 添加凭证（Credential）

1. 点击页面左上角的**设置按钮**（齿轮图标）
2. 在设置弹窗中，切换到"凭证"标签页
3. 点击"添加凭证"按钮
4. 填写以下信息：
   - **Name**: `测试凭证`
   - **Base URL**: `https://api.example.com`
   - **Token**: `test-token-12345`
5. 点击输入框外部或按 Tab 键，配置会自动保存到数据库

#### 3.2 添加模型（Model）

1. 在设置弹窗中，切换到"模型"标签页
2. 点击"添加模型"按钮
3. 填写以下信息：
   - **Model Name**: `测试模型`
   - **Credential**: 选择刚才创建的凭证
   - **POST Path**: `/v1/create`
   - **Query Path**: `/v1/query`
   - **Task ID Path**: `data.task_id`
   - **Status Path**: `data.status`
   - **Output URL Path**: `data.output_url`
   - **JSON Template**: 
     ```json
     {
       "prompt": "{{提示词:textarea}}"
     }
     ```
4. 配置会自动保存到数据库

### 4. 验证数据保存

#### 方法 1：通过浏览器控制台

1. 打开浏览器开发者工具（F12）
2. 查看 Console 标签页，应该能看到以下日志：
   ```
   [Store] 发起 API 请求: /api/nexus/config
   [Store] API 响应状态: 200 OK
   [Store] API 响应数据: {success: true, data: {...}}
   [Store] 配置加载成功: {credentialsCount: 1, modelsCount: 1}
   ```

#### 方法 2：通过调试 API（推荐）

1. 访问 `http://localhost:3000/api/nexus/config/debug`
2. 应该能看到 JSON 格式的调试信息，包含：
   - 用户信息
   - 凭证列表（包含所有字段）
   - 模型列表（包含所有字段和关联的凭证信息）

#### 方法 3：通过 Prisma Studio（最直观）

1. 在终端运行：
   ```bash
   npx prisma studio
   ```
2. 浏览器会自动打开 `http://localhost:5678`
3. 查看以下表：
   - `nexus_credentials` - 凭证数据
   - `nexus_models` - 模型数据
4. 确认数据是否正确保存，并且 `userId` 字段与你的用户 ID 匹配

### 5. 测试数据持久化

1. **刷新页面测试**：
   - 刷新浏览器页面（F5）
   - 配置应该自动从数据库加载
   - 在控制台查看加载日志

2. **重新登录测试**：
   - 退出登录
   - 重新登录
   - 访问 Nexus 页面
   - 配置应该仍然存在

3. **多用户测试**：
   - 创建另一个用户账号
   - 登录新账号
   - 访问 Nexus 页面
   - 应该看不到其他用户的配置（数据隔离）

### 6. 测试配置更新和删除

#### 更新配置

1. 在设置弹窗中，修改凭证或模型的字段
2. 配置会自动保存到数据库
3. 刷新页面，确认修改已保存

#### 删除配置

1. 在设置弹窗中，点击凭证或模型的删除按钮
2. 配置会从数据库中删除
3. 刷新页面，确认删除已生效

## 🔍 调试技巧

### 查看网络请求

1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签页
3. 筛选 `XHR` 或 `Fetch` 请求
4. 查找 `/api/nexus/config` 请求
5. 查看请求和响应详情

### 查看数据库日志

在终端中查看 Next.js 开发服务器的输出，应该能看到：
```
[Nexus Config] 获取配置失败: ...
[Nexus Config] 保存配置失败: ...
```

### 使用调试 API

访问 `http://localhost:3000/api/nexus/config/debug` 查看完整的配置数据。

## ✅ 验证清单

- [ ] 可以添加凭证并保存到数据库
- [ ] 可以添加模型并保存到数据库
- [ ] 刷新页面后配置仍然存在
- [ ] 修改配置后能正确更新数据库
- [ ] 删除配置后能从数据库删除
- [ ] 不同用户的配置数据完全隔离
- [ ] 控制台没有错误信息
- [ ] 网络请求返回 200 状态码

## 🐛 常见问题

### 问题 1：配置保存后刷新页面就消失了

**原因**：可能是数据库连接问题或 API 请求失败

**解决**：
1. 检查浏览器控制台的错误信息
2. 检查 Network 标签页中的 API 请求状态
3. 检查终端中的服务器日志
4. 确认数据库连接正常（访问 `/api/test-db`）

### 问题 2：看到其他用户的配置

**原因**：数据隔离逻辑有问题

**解决**：
1. 检查 API 路由中的 `userId` 过滤是否正确
2. 确认 `getCurrentUser()` 返回正确的用户 ID
3. 检查数据库中的 `userId` 字段是否正确

### 问题 3：配置保存失败

**原因**：可能是数据库事务失败或数据验证错误

**解决**：
1. 查看浏览器控制台的错误信息
2. 查看终端中的服务器日志
3. 检查数据库连接和表结构是否正确
4. 确认所有必填字段都已填写

## 📝 测试数据示例

### 凭证示例

```json
{
  "name": "OpenAI API",
  "baseUrl": "https://api.openai.com",
  "token": "sk-xxxxxxxxxxxxx"
}
```

### 模型示例

```json
{
  "name": "GPT-4",
  "credentialId": "credential-id-here",
  "createPath": "/v1/chat/completions",
  "queryPath": "",
  "paths": {
    "taskId": "id",
    "status": "status",
    "outputUrl": "choices[0].message.content"
  },
  "bodyTemplate": "{\n  \"model\": \"gpt-4\",\n  \"messages\": [{\n    \"role\": \"user\",\n    \"content\": \"{{提示词:textarea}}\"\n  }]\n}"
}
```

## 🎉 完成测试

如果所有验证项都通过，说明 Nexus 配置数据已正确保存到数据库，并且数据隔离功能正常工作！

