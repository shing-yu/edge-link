// functions/index.js

const FAVICON_HTML = `
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/%3E%3C/svg%3E">
`;

export async function onRequest(context) {
  const { env } = context;
  const lang = env.LANG || 'en'; // 获取环境变量，默认为英文
  
  // 语言包定义
  const i18n = {
    zh: {
      title: env.SITE_TITLE || "EdgeLink",
      subtitle: env.SITE_SUBTITLE || "一个简单的 EdgeOne Pages 短链接服务。",
    },
    en: {
      title: env.SITE_TITLE || "EdgeLink",
      subtitle: env.SITE_SUBTITLE || "A simple shortlink service for EdgeOne Pages.",
    },
  };
  
  const t = i18n[lang] || i18n.en;
  
  const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
  ${FAVICON_HTML}
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body { font-family: system-ui, -apple-system, sans-serif; }</style>
</head>
<body class="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
  
  <div class="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
    <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
    <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
  </div>

  <main class="text-center px-4 z-10">
    <div class="mb-6 flex justify-center">
      <div class="p-4 bg-white/10 rounded-2xl backdrop-blur-lg border border-white/10 shadow-xl">
        <svg class="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>
    </div>
    <h1 class="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-4 pb-2">
      ${t.title}
    </h1>
    <p class="text-xl text-gray-400 max-w-lg mx-auto mb-8">
      ${t.subtitle}
    </p>
  </main>

  <footer class="absolute bottom-6 w-full text-center text-gray-500 text-sm flex flex-col items-center gap-2">
    <div class="flex items-center gap-2">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
      </svg>
      <a href="https://github.com/shing-yu/edge-link" target="_blank" class="hover:text-blue-400 transition-colors">edge-link</a>
    </div>
    <span>Powered by EdgeOne Pages</span>
  </footer>
</body>
</html>
  `;

  return new Response(html, {
    headers: { "content-type": "text/html;charset=UTF-8" },
  });
}