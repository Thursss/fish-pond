export function App() {
  const testFetch = () => {
    fetch('https://www.jiujiuzhuanche.com/ddd/fff')
  }

  return (
    <div>
      <h1>Lighthouse 监控 SDK 测试</h1>
      <p>打开浏览器控制台查看监控数据输出</p>
      <button id="test-button">测试点击事件</button>
      <img src="https://www.jiujiuzhuanche.com/images/newHomePage1.jpg" alt="newHomePage" />
      <input type="text" placeholder="输入测试" />
      <button id="test-button2" onClick={testFetch}>测试点击事件2</button>
    </div>
  )
}
