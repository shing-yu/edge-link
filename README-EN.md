# 🔗 EdgeLink (EdgeOne URL Shortener)

**EdgeLink** is a lightweight, secure, serverless URL shortener system built on **Tencent Cloud EdgeOne Pages**.

Leveraging EdgeOne's global edge network and KV storage, it provides millisecond-level redirect speeds without the need for traditional backend servers or databases.

If this project helps you, please give it a Star 🌟!

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-EdgeOne_Pages-blueviolet)

## ✨ Features

- **Full Edge Execution**: Runs entirely on EdgeOne Functions with global acceleration.
- **KV Storage**: Uses EdgeOne KV storage for mapping, ensuring extremely fast read speeds.
- **Hidden Path Security**: Uses a "Security by Obscurity" approach via a super-long (64+ chars) random path for the admin dashboard. This eliminates complex login systems while maintaining security.
- **No Build Required**: Written in vanilla JavaScript. The frontend uses Tailwind CSS via CDN—no `npm install` or build steps needed.
- **Interstitial Mode**: Supports a "Safe Interstitial Page" for specific links to warn users they are leaving the site.
- **Multi-language Support**: Built-in English and Chinese support, switchable via environment variables.
- **Dark Mode**: Features a modern dark UI design by default.

## 🚀 Deployment Guide

### 1. Prerequisites
- A Tencent Cloud account with **EdgeOne** service enabled.
- Enable KV Storage in the EdgeOne Console -> Pages -> KV Storage.

### 2. Start Deployment

[![Deploy with EdgeOne Pages](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?repository-url=https://github.com/shing-yu/edge-link&env=ADMIN_PATH)

On the deployment page, configure the `ADMIN_PATH` environment variable. **The length must be greater than or equal to 64 characters.**  
Optionally configure `LANG`, `SITE_TITLE`, and `SITE_SUBTITLE`.

Keep the build settings as default and click **Create** to start deployment.

### 3. Configure KV Namespace
After the deployment finishes, configure the KV Namespace:

1. Go to EdgeOne Console -> Pages -> KV Storage.
2. Create a new namespace (e.g., `prod-links`).
3. Go to your **Pages Project Settings** -> **KV Storage** -> **Bind Namespace**.
4. Bind the namespace you just created to the variable name: `my_kv` (**Note**: The variable name must be exactly `my_kv`).

### 4. Set Environment Variables (Optional)
Go to **Project Settings** -> **Environment Variables** to add or modify variables:

| Variable Name | Required | Description |
| :--- | :--- | :--- |
| `ADMIN_PATH` | **Yes** | The access path for the admin dashboard (excluding `/`). **Must be >= 64 characters**. <br>Example: `super-long-secret-key-xyz-123...` |
| `LANG` | No | Set to `en` for English, `zh` for Chinese. Defaults to `en`. |
| `SITE_TITLE` | No | Custom title for the homepage. |
| `SITE_SUBTITLE` | No | Custom subtitle for the homepage. |

### 5. Redeploy
Go to the **Build Deployment** page, and click More - Redeploy on the right side of the latest deployment record.

### 6. Other Configurations
Bind domain name, etc.

## 🛠 Usage

### Accessing the Admin Dashboard
Visit your configured secret path:
`https://your-domain.com/<YOUR_CONFIGURED_ADMIN_PATH>`

*Note: Since this system uses a "Hidden Path" strategy instead of traditional login, please keep your admin path secret. The system enforces a minimum length of 64 characters to prevent brute-force scanning.*

### API (Optional)
The admin dashboard uses a simple internal API which you can also call via scripts:
**Endpoint:** `POST /<YOUR_CONFIGURED_ADMIN_PATH>`

**Request Examples:**

*   **Create/Update Short Link:**
    ```json
    { "action": "create", "slug": "twitter", "target": "https://twitter.com", "interstitial": false }
    ```
*   **Delete Short Link:**
    ```json
    { "action": "delete", "slug": "twitter" }
    ```
*   **List All Links:**
    ```json
    { "action": "list" }
    ```

## 🤝 Contributing

The owner built this project with the assistance of AI and is not an expert in Node.js.

Any form of contribution is welcome, including but not limited to code, documentation, bug reports, and feature suggestions.

## 📄 License

This project is open-sourced under the MIT License.

## Acknowledgments

Thanks to [EdgeOne.ai](https://edgeone.ai) for providing a generous free tier for developers and open-source projects.