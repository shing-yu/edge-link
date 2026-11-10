// functions/[[path]].js
// noinspection JSUnresolvedReference

const MESSAGES = {
  en: {
    adminTitle: "Short Link Manager",
    protected: "Protected Area",
    createTitle: "Create New Link",
    labelSlug: "Slug (Short Path)",
    labelTarget: "Target URL",
    labelInterstitial: "Interstitial Page",
    labelCode: "Extraction Code",
    codeHint: "Optional. Only used when the interstitial page is enabled: the code is shown on that page and automatically copied when the visitor clicks Continue.",
    codePlaceholder: "Optional",
    btnCopy: "Copy",
    copied: "Copied",
    btnSave: "Save",
    thSlug: "Slug",
    thDest: "Destination",
    thVisits: "Visits",
    thMode: "Mode",
    thAction: "Actions",
    loading: "Loading links...",
    noLinks: "No links found.",
    modeMid: "Interstitial",
    modeDirect: "Direct",
    btnEdit: "Edit",
    btnDelete: "Delete",
    confirmDel: "Delete /",
    powered: "Powered by EdgeOne Pages",
    interTitle: "Redirecting",
    interMsg: "You are about to be redirected to an external website.",
    btnContinue: "Continue to Site",
    btnCancel: "Cancel",
    notFoundTitle: "Link Not Found",
    notFoundMsg: "The short link you are looking for does not exist.",
    btnHome: "Go Home",
    btnLearn: "Learn about Project"
  },
  zh: {
    adminTitle: "短链接管理后台",
    protected: "Protected Area",
    createTitle: "新建/修改短链接",
    labelSlug: "短链后缀 (Slug)",
    labelTarget: "目标跳转地址 (URL)",
    labelInterstitial: "启用中间页",
    labelCode: "提取码",
    codeHint: "选填。仅当开启中间页时生效：访客会在中间页看到该提取码，点击“继续访问”时自动复制，方便到目标页面使用。",
    codePlaceholder: "选填",
    btnCopy: "复制",
    copied: "已复制",
    btnSave: "保存配置",
    thSlug: "后缀路径",
    thDest: "目标地址",
    thVisits: "访问次数",
    thMode: "跳转模式",
    thAction: "操作",
    loading: "正在加载数据...",
    noLinks: "暂无短链接数据",
    modeMid: "中间页",
    modeDirect: "Direct",
    btnEdit: "编辑",
    btnDelete: "删除",
    confirmDel: "确认删除短链 /",
    powered: "Powered by EdgeOne Pages",
    interTitle: "即将重定向",
    interMsg: "您即将被重定向到外部网站，请注意信息安全。",
    btnContinue: "继续访问",
    btnCancel: "取消",
    notFoundTitle: "链接不存在",
    notFoundMsg: "您访问的短链接不存在或已被删除。",
    btnHome: "访问首页",
    btnLearn: "了解项目"
  }
};

const FAVICON_HTML = `
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/%3E%3C/svg%3E">
`;

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsString(value) {
  return JSON.stringify(String(value == null ? '' : value)).replace(/</g, '\\u003c');
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const lang = env.LANG || 'en';
  const t = MESSAGES[lang] || MESSAGES.en;

  
  // 获取路径参数，如果访问 /admin 则 path 为 admin
  // 这里的 path 是数组，我们需要将其合并
  const path = params.path ? (Array.isArray(params.path) ? params.path.join('/') : params.path) : '';
  
  const ADMIN_PATH = env.ADMIN_PATH;

  // 安全检查：强制 ADMIN_PATH 长度
  if (!ADMIN_PATH || ADMIN_PATH.length < 64) {
    return new Response("Security Error: ADMIN_PATH environment variable must be at least 64 characters long.", { status: 500 });
  }

  // --- 场景 1: 管理后台 (API & UI) ---
  if (path === ADMIN_PATH) {
    // 处理 API 请求 (POST)
    if (request.method === "POST") {
      try {
        const body = await request.json();
        const { action, slug, target, interstitial, code } = body;

        if (action === "list") {
          // 获取 KV 列表
          // EdgeOne 返回结构: { complete: boolean, cursor: string, keys: [{ key: "slug1" }, ...] }
          const list = await my_kv.list(); 
          const keys = list.keys || [];
          
          // 并发获取详细信息
          const detailedList = await Promise.all(keys.map(async (item) => {
            // 注意：这里根据 ListKey 定义，使用 item.key 获取键名
            const slug = item.key; 
            const val = await my_kv.get(slug);
            
            // 容错处理：如果 val 为空则返回空对象，防止 JSON.parse 报错
            let parsedData = {};
            try {
              parsedData = val ? JSON.parse(val) : {};
            } catch (e) {
              parsedData = { url: "Invalid Data" };
            }

            return { 
              slug: slug, 
              ...parsedData
            };
          }));
          
          return new Response(JSON.stringify({ success: true, data: detailedList }), { 
            headers: { "content-type": "application/json" } 
          });
        }

        if (action === "create" || action === "update") {
          if (!slug || !target) return new Response(JSON.stringify({ success: false, error: "Missing fields" }));
          
          // Preserve existing visits count if updating
          let visits = 0;
          let existing = null;
          try {
            const existingRaw = await my_kv.get(slug);
            if (existingRaw) {
              existing = JSON.parse(existingRaw);
              visits = existing.visits || 0;
            }
          } catch (e) {}

          // 兼容旧数据：仅当请求里显式传了 code 时才覆盖，否则保留已有提取码
          const normalizedCode = typeof code === "string" ? code.trim() : (existing && existing.code) || "";

          // 写入数据
          const data = {
            url: target,
            interstitial: !!interstitial,
            code: interstitial ? normalizedCode : "",
            updatedAt: Date.now(),
            visits: visits
          };
          await my_kv.put(slug, JSON.stringify(data));
          return new Response(JSON.stringify({ success: true }));
        }

        if (action === "delete") {
          if (!slug) return new Response(JSON.stringify({ success: false }));
          await my_kv.delete(slug);
          return new Response(JSON.stringify({ success: true }));
        }

      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }));
      }
    }

    // 渲染管理界面 UI (GET)
    return renderAdminPage(env, t, lang);
  }

  // --- 场景 2: 短链接跳转 ---
  if (path) {
    const rawData = await my_kv.get(path);
    
    if (rawData) {
      const data = JSON.parse(rawData);

      data.visits = (data.visits || 0) + 1;
      await my_kv.put(path, JSON.stringify(data));


      // 如果开启了中间页
      if (data.interstitial) {
        return renderInterstitialPage(data.url, data.code || "", env, t, lang);
      }
      
      // 直接跳转
        return Response.redirect(data.url, 307);  // 遵循 HTTP 标准，使用 307 Temporary Redirect 保持原请求方法（如 POST）
    }
  }

  // --- 场景 3: 404 页面 ---
  return render404Page(env, t, lang);
}

// ------------------------------------------------------------------
// HTML 渲染辅助函数
// ------------------------------------------------------------------

function renderAdminPage(env, t, lang) {
  const html = `
<!DOCTYPE html>
<html lang="${lang}" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.adminTitle}</title>
  ${FAVICON_HTML}
  <link href="/style.css" rel="stylesheet">
  <style>
    #codeField {
      grid-column: 1 / -1;
    }
    .code-tip {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .code-tip .code-tip-text {
      visibility: hidden;
      opacity: 0;
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      width: 280px;
      padding: 8px 10px;
      border-radius: 8px;
      background: #1e293b;
      border: 1px solid #475569;
      color: #cbd5e1;
      font-size: 12px;
      line-height: 1.5;
      text-align: left;
      font-weight: normal;
      pointer-events: none;
      transition: opacity .15s ease, visibility .15s ease;
      z-index: 30;
    }
    .code-tip:hover .code-tip-text,
    .code-tip:focus .code-tip-text,
    .code-tip:focus-within .code-tip-text {
      visibility: visible;
      opacity: 1;
    }
  </style>
</head>
<body class="bg-slate-900 text-slate-200 min-h-screen p-6 font-sans">
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <header class="flex justify-between items-center mb-10 border-b border-slate-700 pb-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-blue-600 rounded-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <h1 class="text-2xl font-bold tracking-tight">${t.adminTitle}</h1>
      </div>
      <div class="text-xs text-slate-500 font-mono bg-slate-800 px-3 py-1 rounded border border-slate-700">${t.protected}</div>
    </header>

    <!-- Form -->
    <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 mb-8 shadow-lg backdrop-blur-sm">
      <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">${t.createTitle}</h2>
      <form id="linkForm" class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div class="md:col-span-3">
          <label class="block text-xs font-medium text-slate-400 mb-1">${t.labelSlug}</label>
          <input type="text" id="inpSlug" required placeholder="e.g. twitter" class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 outline-none transition">
        </div>
        <div class="md:col-span-5">
          <label class="block text-xs font-medium text-slate-400 mb-1">${t.labelTarget}</label>
          <input type="url" id="inpUrl" required placeholder="https://..." class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 outline-none transition">
        </div>
        <div class="md:col-span-2 flex items-center h-10">
           <label class="inline-flex items-center cursor-pointer">
            <input type="checkbox" id="inpInterstitial" class="sr-only peer">
            <div class="relative w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            <span class="ms-2 text-sm text-slate-300">${t.labelInterstitial}</span>
          </label>
        </div>
        <div class="md:col-span-2">
          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded transition-colors shadow-lg text-sm">${t.btnSave}</button>
        </div>
        <div id="codeField" style="display:none;">
          <label class="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-2">
            <span>${t.labelCode}</span>
            <span class="code-tip" tabindex="0">
              <svg class="w-4 h-4 text-slate-500 hover:text-white transition-colors cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span class="code-tip-text">${t.codeHint}</span>
            </span>
          </label>
          <input type="text" id="inpCode" maxlength="64" placeholder="${t.codePlaceholder}" class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 outline-none transition">
        </div>
      </form>
    </div>

    <!-- List -->
    <div class="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-400">
          <thead class="bg-slate-900/50 text-xs uppercase font-medium text-slate-500">
            <tr>
              <th class="px-6 py-4">${t.thSlug}</th>
              <th class="px-6 py-4">${t.thDest}</th>
              <th class="px-6 py-4 text-center">${t.thVisits}</th>
              <th class="px-6 py-4 text-center">${t.thMode}</th>
              <th class="px-6 py-4 text-right">${t.thAction}</th>
            </tr>
          </thead>
          <tbody id="tableBody" class="divide-y divide-slate-700/50">
            <tr><td colspan="5" class="px-6 py-8 text-center">${t.loading}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <footer class="mt-12 text-center text-slate-600 text-sm flex flex-col items-center gap-2">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" /></svg>
        <a href="https://github.com/shing-yu/edge-link" target="_blank" class="hover:text-slate-400">edge-link</a>
      </div>
      <span>${t.powered}</span>
    </footer>
  </div>

  <script>
    const API_URL = window.location.href;
    const TXT = {
      noLinks: "${t.noLinks}",
      mid: "${t.modeMid}",
      direct: "${t.modeDirect}",
      confirmDel: "${t.confirmDel}"
    };

    function jsStr(s) {
      return JSON.stringify(String(s == null ? '' : s))
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
    }

    function syncCodeField() {
      var on = document.getElementById('inpInterstitial').checked;
      document.getElementById('codeField').style.display = on ? '' : 'none';
    }

    async function loadLinks() {
      const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'list' }) });
      const json = await res.json();
      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = '';
      
      if (!json.success || json.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-slate-500">' + TXT.noLinks + '</td></tr>';
        return;
      }

      json.data.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-700/30 transition-colors group";
        const modeBadge = item.interstitial 
          ? '<span class="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">' + TXT.mid + '</span>'
          : '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-500/30">' + TXT.direct + '</span>';
          
        tr.innerHTML = \`
          <td class="px-6 py-4 font-medium text-slate-200">
            <a href="/\${item.slug}" target="_blank" class="text-blue-400 hover:underline">/\${item.slug}</a>
          </td>
          <td class="px-6 py-4 truncate max-w-xs" title="\${item.url}">\${item.url}</td>
          <td class="px-6 py-4 text-center text-slate-400">\${item.visits || 0}</td>
          <td class="px-6 py-4 text-center">\${modeBadge}</td>
          <td class="px-6 py-4 text-right space-x-2">
            <button onclick="editLink(\${jsStr(item.slug)}, \${jsStr(item.url)}, \${item.interstitial}, \${jsStr(item.code)})" class="text-slate-400 hover:text-white transition-colors">${t.btnEdit}</button>
            <button onclick="deleteLink(\${jsStr(item.slug)})" class="text-red-400 hover:text-red-300 transition-colors">${t.btnDelete}</button>
          </td>
        \`;
        tbody.appendChild(tr);
      });
    }

    async function saveLink(e) {
      e.preventDefault();
      const slug = document.getElementById('inpSlug').value;
      const target = document.getElementById('inpUrl').value;
      const interstitial = document.getElementById('inpInterstitial').checked;
      const code = document.getElementById('inpCode').value;
      
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'create', slug, target, interstitial, code })
      });
      if(res.ok) {
        document.getElementById('linkForm').reset();
        syncCodeField();
        loadLinks();
      } else { alert('Error saving'); }
    }

    async function deleteLink(slug) {
      if(!confirm(TXT.confirmDel + slug + '?')) return;
      await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'delete', slug }) });
      loadLinks();
    }

    window.editLink = function(slug, url, interstitial, code) {
      document.getElementById('inpSlug').value = slug;
      document.getElementById('inpUrl').value = url;
      document.getElementById('inpInterstitial').checked = interstitial;
      document.getElementById('inpCode').value = code || '';
      syncCodeField();
      document.getElementById('inpUrl').focus();
    }

    document.getElementById('inpInterstitial').addEventListener('change', syncCodeField);
    document.getElementById('linkForm').addEventListener('submit', saveLink);
    syncCodeField();
    loadLinks();
  </script>
</body>
</html>
  `;
  return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
}

function renderInterstitialPage(targetUrl, code, env, t, lang) {
  const hasCode = !!code;
  const codeHtml = hasCode ? `
    <div class="code-box">
      <div class="code-box-label">${t.labelCode}</div>
      <div class="code-box-value">
        <span id="codeText" class="code-box-code" title="${escapeHtml(code)}">${escapeHtml(code)}</span>
        <button type="button" id="copyCodeBtn" class="code-copy-btn">${t.btnCopy}</button>
      </div>
    </div>
  ` : '';

  const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.interTitle}</title>
  ${FAVICON_HTML}
  <link href="/style.css" rel="stylesheet">
  <style>
    .code-box {
      margin-bottom: 1.5rem;
      padding: 0.75rem 1rem;
      border: 1px solid #374151;
      border-radius: 0.75rem;
      background: rgba(55, 65, 81, 0.35);
      text-align: left;
    }
    .code-box-label {
      font-size: 0.75rem;
      color: #9ca3af;
      margin-bottom: 0.375rem;
    }
    .code-box-value {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .code-box-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.875rem;
      color: #60a5fa;
      word-break: break-all;
      user-select: all;
      cursor: pointer;
    }
    .code-box-code:hover {
      color: #93c5fd;
    }
    .code-copy-btn {
      flex-shrink: 0;
      font-size: 0.75rem;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid #4b5563;
      border-radius: 0.5rem;
      padding: 0.375rem 0.75rem;
      cursor: pointer;
      transition: color .15s ease, background-color .15s ease, border-color .15s ease;
    }
    .code-copy-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.16);
      border-color: #6b7280;
    }
  </style>
</head>
<body class="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
  <div class="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700 text-center">
    <div class="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
    </div>
    <h1 class="text-2xl font-bold mb-2">${t.interTitle}</h1>
    <p class="text-gray-400 mb-8 text-sm">${t.interMsg}<br><span class="text-blue-400 break-all">${targetUrl}</span></p>
    
    ${codeHtml}
    
    <a id="btnContinue" href="${targetUrl}" class="block w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-900/50 mb-4">
      ${t.btnContinue}
    </a>
    <!-- <button onclick="history.back()" class="text-gray-500 hover:text-white text-sm transition-colors">${t.btnCancel}</button> -->
  </div>

  <footer class="mt-12 text-center text-gray-600 text-xs flex flex-col items-center gap-2">
     <div class="flex items-center gap-2">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" /></svg>
      <a href="https://github.com/shing-yu/edge-link" target="_blank">edge-link</a>
    </div>
    <span>${t.powered}</span>
  </footer>

  <script>
    (function() {
      var code = ${jsString(code)};
      var copyBtn = document.getElementById('copyCodeBtn');
      var codeText = document.getElementById('codeText');
      var continueBtn = document.getElementById('btnContinue');

      function copyText(text) {
        var done = false;
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length);
        try { done = document.execCommand('copy'); } catch (e) { done = false; }
        document.body.removeChild(ta);
        if (!done && navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).catch(function() {});
        }
        return done;
      }

      function flashCopy() {
        if (!copyBtn) return;
        copyBtn.textContent = ${jsString(t.copied)};
        setTimeout(function() { copyBtn.textContent = ${jsString(t.btnCopy)}; }, 1500);
      }

      if (copyBtn) {
        copyBtn.addEventListener('click', function() {
          copyText(code);
          flashCopy();
        });
      }
      if (codeText) {
        codeText.addEventListener('click', function() {
          copyText(code);
          flashCopy();
        });
      }
      if (continueBtn && code) {
        continueBtn.addEventListener('click', function() {
          copyText(code);
        });
      }
    })();
  </script>
</body>
</html>
  `;
  return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
}

function render404Page(env, t, lang) {
  const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.notFoundTitle}</title>
  ${FAVICON_HTML}
  <link href="/style.css" rel="stylesheet">
</head>
<body class="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
  
  <div class="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
    <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
    <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
  </div>

  <main class="text-center px-4 z-10 flex flex-col items-center">
    <div class="mb-6 flex justify-center">
      <div class="p-4 bg-white/10 rounded-2xl backdrop-blur-lg border border-white/10 shadow-xl">
        <svg class="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </div>
    </div>
    
    <h1 class="text-7xl md:text-9xl font-bold text-white mb-2 select-none tracking-tight">
      404
    </h1>
    <h2 class="text-2xl md:text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 pb-1">${t.notFoundTitle}</h2>
    <p class="text-gray-400 max-w-md mx-auto mb-10">${t.notFoundMsg}</p>
    
    <div class="flex flex-col sm:flex-row gap-4 w-full justify-center mt-2 mx-auto">
      <a href="/" class="w-full sm:w-auto min-w-[140px] bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-900/50 text-center whitespace-nowrap">
        ${t.btnHome}
      </a>
      <a href="https://github.com/shing-yu/edge-link" target="_blank" class="w-full sm:w-auto min-w-[140px] bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl backdrop-blur-sm border border-white/10 transition-all transform hover:scale-[1.02] shadow-lg text-center flex items-center justify-center gap-2 whitespace-nowrap">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" /></svg>
        ${t.btnLearn}
      </a>
    </div>
  </main>

  <footer class="absolute bottom-6 w-full text-center text-gray-500 text-sm flex flex-col items-center gap-2">
    <span>${t.powered}</span>
  </footer>
</body>
</html>
  `;
  return new Response(html, { status: 404, headers: { "content-type": "text/html;charset=UTF-8" } });
}