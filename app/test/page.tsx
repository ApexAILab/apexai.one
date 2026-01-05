"use client";

export default function TestPage() {
  console.log("[Test] 页面组件渲染");
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">测试页面</h1>
      <p>如果你能看到这个页面，说明路由正常工作。</p>
      <p className="mt-4 text-sm text-zinc-500">
        请检查浏览器控制台，应该能看到 "[Test] 页面组件渲染" 的日志。
      </p>
    </div>
  );
}

