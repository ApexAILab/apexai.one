/**
 * PWA Meta Tags 组件
 * 在客户端添加额外的 PWA meta 标签
 */
export function PWAMetaTags() {
  return (
    <>
      {/* 这些标签会在客户端通过 useEffect 添加到 head */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // 添加 PWA meta 标签
              const metaTags = [
                { name: 'application-name', content: 'ApexAI' },
                { name: 'apple-mobile-web-app-capable', content: 'yes' },
                { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
                { name: 'apple-mobile-web-app-title', content: 'ApexAI' },
                { name: 'mobile-web-app-capable', content: 'yes' },
              ];
              
              metaTags.forEach(tag => {
                if (!document.querySelector(\`meta[name="\${tag.name}"]\`)) {
                  const meta = document.createElement('meta');
                  meta.name = tag.name;
                  meta.content = tag.content;
                  document.head.appendChild(meta);
                }
              });
              
              // 添加 manifest link
              if (!document.querySelector('link[rel="manifest"]')) {
                const link = document.createElement('link');
                link.rel = 'manifest';
                link.href = '/manifest.json';
                document.head.appendChild(link);
              }
              
              // 添加 apple-touch-icon
              if (!document.querySelector('link[rel="apple-touch-icon"]')) {
                const link = document.createElement('link');
                link.rel = 'apple-touch-icon';
                link.href = '/apple-touch-icon.png';
                document.head.appendChild(link);
              }
            })();
          `,
        }}
      />
    </>
  );
}

