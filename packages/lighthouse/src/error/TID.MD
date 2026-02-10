## 📌 一、目标

* 浏览器错误捕获机制（同步 JS 错误、未处理 Promise）
* AOP 技术劫持原生 API (`XMLHttpRequest`、`fetch`) 做网络错误监控
* 资源加载错误监控（如图片、脚本等）
* 错误数据可靠上报策略（优先使用 `sendBeacon`） ([CodeLove][2])

---

## 🏗️ 二、SDK 设计架构

整体分为三部分：

````
监控入口
├─ 错误捕获
├─ 网络监控
├─ 资源监控
└─ 上报模块
``` :contentReference[oaicite:3]{index=3}

---

## 📍 三、核心原理与实现

---

### 🧩 3.1 初始化入口

在入口文件初始化各模块：

```ts
import { monitorJavaScriptErrors } from './errorHandler';
import { monitorNetworkErrors } from './networkMonitor';
import { monitorResourceErrors } from './resourceMonitor';

export const initErrorMonitor = (config) => {
  const { reportUrl, projectName, environment } = config;

  monitorJavaScriptErrors(reportUrl, projectName, environment);
  monitorNetworkErrors(reportUrl, projectName, environment);
  monitorResourceErrors(reportUrl, projectName, environment);
};
````

---

### 🛑 3.2 JavaScript 错误捕获

捕获同步错误与未处理 Promise：

* `window.onerror`：捕获同步脚本错误
* `window.onunhandledrejection`：捕获未处理的 Promise 异常

```ts
const originalOnError = window.onerror;
window.onerror = (message, source, lineno, colno, error) => {
  sendErrorData({...}, reportUrl);
  originalOnError?.(message, source, lineno, colno, error);
};
```

---

### 🌐 3.3 网络请求监控

劫持原生网络 API：

#### 🔹 XMLHttpRequest

```ts
const originalXhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, ...args) {
  this.addEventListener('error', () => {
    sendErrorData({...}, reportUrl);
  });
  return originalXhrOpen.apply(this, [method, url, ...args]);
};
```

#### 🔹 fetch

```ts
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const response = await originalFetch(input, init);
  if (!response.ok) {
    sendErrorData({...}, reportUrl);
  }
  return response;
};
```

---

### 🖼️ 3.4 资源加载错误监控

资源加载错误不会冒泡，需要在捕获阶段监听：

```ts
window.addEventListener(
  'error',
  (event) => {
    const target = event.target;
    if (target.tagName === 'IMG' || target.tagName === 'SCRIPT') {
      sendErrorData({...}, reportUrl);
    }
  },
  true
);
```

---

### 📡 3.5 数据上报策略

为了保证在页面卸载时也能上报：

#### ✔ 使用 Navigator.sendBeacon

优点：

* 不阻塞页面跳转
* 浏览器保证发送

```ts
if (navigator.sendBeacon) {
  navigator.sendBeacon(reportUrl, blob);
} else {
  fetch(reportUrl, {...});
}
```