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
    btnHome: "Go Home"
  },
  zh: {
    adminTitle: "短链接管理后台",
    protected: "Protected Area",
    createTitle: "新建/修改短链接",
    labelSlug: "短链后缀 (Slug)",
    labelTarget: "目标跳转地址 (URL)",
    labelInterstitial: "启用中间页",
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
    btnHome: "返回首页"
  }
};

const FAVICON_HTML = `
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/%3E%3C/svg%3E">
`;

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
        const { action, slug, target, interstitial } = body;

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
          try {
            const existingRaw = await my_kv.get(slug);
            if (existingRaw) {
              const existing = JSON.parse(existingRaw);
              visits = existing.visits || 0;
            }
          } catch (e) {}

          // 写入数据
          const data = {
            url: target,
            interstitial: !!interstitial,
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
        return renderInterstitialPage(data.url, env, t, lang);
      }
      
      // 直接跳转
      return Response.redirect(data.url, 302);
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
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config = { darkMode: 'class' }</script>
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
            <button onclick="editLink('\${item.slug}', '\${item.url}', \${item.interstitial})" class="text-slate-400 hover:text-white transition-colors">${t.btnEdit}</button>
            <button onclick="deleteLink('\${item.slug}')" class="text-red-400 hover:text-red-300 transition-colors">${t.btnDelete}</button>
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
      
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'create', slug, target, interstitial })
      });
      if(res.ok) {
        document.getElementById('linkForm').reset();
        loadLinks();
      } else { alert('Error saving'); }
    }

    async function deleteLink(slug) {
      if(!confirm(TXT.confirmDel + slug + '?')) return;
      await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'delete', slug }) });
      loadLinks();
    }

    window.editLink = function(slug, url, interstitial) {
      document.getElementById('inpSlug').value = slug;
      document.getElementById('inpUrl').value = url;
      document.getElementById('inpInterstitial').checked = interstitial;
      document.getElementById('inpUrl').focus();
    }

    document.getElementById('linkForm').addEventListener('submit', saveLink);
    loadLinks();
  </script>
</body>
</html>
  `;
  return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
}

function renderInterstitialPage(targetUrl, env, t, lang) {
  const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.interTitle}</title>
  ${FAVICON_HTML}
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
  <div class="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700 text-center">
    <div class="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
    </div>
    <h1 class="text-2xl font-bold mb-2">${t.interTitle}</h1>
    <p class="text-gray-400 mb-8 text-sm">${t.interMsg}<br><span class="text-blue-400 break-all">${targetUrl}</span></p>
    
    <a href="${targetUrl}" class="block w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-900/50 mb-4">
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
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-950 text-white min-h-screen flex flex-col items-center justify-center p-4">
  <h1 class="text-9xl font-black text-gray-800 select-none">404</h1>
  <div class="absolute text-center">
    <h2 class="text-3xl font-bold mb-2 text-gray-100">${t.notFoundTitle}</h2>
    <p class="text-gray-400 mb-6">${t.notFoundMsg}</p>
    <a href="/" class="px-6 py-2 bg-white text-gray-900 font-semibold rounded-full hover:bg-gray-200 transition-colors">${t.btnHome}</a>
  </div>
</body>
</html>
  `;
  return new Response(html, { status: 404, headers: { "content-type": "text/html;charset=UTF-8" } });
}