# 🔗 EdgeLink (EdgeOne 短链接)

**EdgeLink** 是一个基于 **腾讯云 EdgeOne Pages** 构建的轻量级、安全、无服务器（Serverless）短链接系统。  
它利用 EdgeOne 的全球边缘网络和 KV 存储，无需传统后端服务器或数据库，即可提供毫秒级的极速跳转体验。

如果本项目对您有帮助，欢迎给个 Star 🌟 支持！

[English Version](README-EN.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-EdgeOne_Pages-blueviolet)

## ✨ 功能特点

- **全边缘运行**：完全基于 EdgeOne Functions 运行，全球加速。
- **KV 存储**：使用 EdgeOne KV 存储映射关系，读取速度极快。
- **隐蔽式安全管理**：通过设置超长（64位+）的随机路径进入管理后台，免去复杂的登录鉴权系统的同时保证安全。
- **无需构建**：纯原生 JavaScript 编写，前端使用 Tailwind CSS CDN，无需 `npm install` 或构建步骤。
- **中间页模式**：支持为特定链接开启“安全中间页”，提示用户即将跳转第三方网站。
- **多语言支持**：内置中英文语言包，通过环境变量一键切换。
- **暗黑模式**：默认提供极具现代感的暗色 UI 设计。

## 🚀 部署指南

### 1. 准备工作
- 拥有腾讯云账号并开通 **EdgeOne** 服务。
- 在 EdgeOne控制台-Pages-KV存储 页面开启 KV 存储服务。

### 2. 开始部署
[![使用国内版EdgeOne Pages 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?repository-url=https://github.com/shing-yu/edge-link&env=ADMIN_PATH)
或 [使用国际版部署](https://edgeone.ai/pages/new?repository-url=https://github.com/shing-yu/edge-link&env=ADMIN_PATH)

在部署页面配置环境变量 `ADMIN_PATH`，长度必须大于等于 64 个字符。  
可按需配置 `LANGUAGE`、`SITE_TITLE`、`SITE_SUBTITLE` 等环境变量。  

构建设置保持默认，点击 **立即创建** 开始部署。

### 3. 配置 KV 命名空间
等待部署完成后，配置 KV 命名空间。

1. 进入 EdgeOne 控制台 -> Pages -> KV 存储。
2. 创建一个新的命名空间（例如：`prod-links`）。
3. 进入你的 **Pages 项目设置** -> **KV 存储** -> **绑定命名空间**。
4. 将刚才创建的命名空间绑定到变量名：`my_kv` (注意：变量名必须完全一致)。

### 4. 设置环境变量（可选）
进入 **项目设置** -> **环境变量**，选择添加以下变量：

| 变量名 | 是否必填 | 说明 |
| :--- | :--- | :--- |
| `ADMIN_PATH` | **是** | 管理后台的访问路径（不含 `/`）。**长度必须大于等于 64 个字符**。<br>示例：`super-long-secret-key-xyz-123...` |
| `LANGUAGE` | 否 | 设置为 `zh` 显示中文，设置为 `en` 显示英文。默认为 `en`。 |
| `SITE_TITLE` | 否 | 自定义首页标题。 |
| `SITE_SUBTITLE` | 否 | 自定义首页副标题。 |

### 5. 部署
保存设置并重新部署项目。

## 🛠 使用说明

### 进入管理后台
访问你配置的私密路径：
`https://你的域名.com/<你配置的_ADMIN_PATH_值>`

*注意：由于本系统采用“路径隐蔽”策略替代传统登录，请务必保管好你的管理路径。系统强制要求路径长度至少 64 位，以防止被暴力扫描。*

### API 调用 (可选)
管理后台前端使用简单的内部 API，你也可以通过脚本调用：
**接口地址:** `POST /<你配置的_ADMIN_PATH_值>`

**请求示例:**

*   **创建/更新短链:**
    ```json
    { "action": "create", "slug": "twitter", "target": "https://twitter.com", "interstitial": false }
    ```
*   **删除短链:**
    ```json
    { "action": "delete", "slug": "twitter" }
    ```
*   **获取列表:**
    ```json
    { "action": "list" }
    ```

## 🤝 贡献

Owner 在 AI 辅助下完成本项目，对 Node.js 并不熟悉；

故欢迎任何形式的贡献，包括但不限于代码、文档、问题报告、功能建议等。

## 📄 开源协议

本项目基于 MIT 协议开源。

## 致谢

感谢 [腾讯云 边缘安全加速平台 EO](https://cloud.tencent.com/product/teo) 为所有个人/开源项目开发者提供的免费版套餐。