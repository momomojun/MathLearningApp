import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router'
import { authState } from './auth'
import { hydrateFromServer, setupSyncListeners } from './utils/syncClient'

setupSyncListeners()
// 已登录用户重新打开应用时，用服务端数据水合本地进度（服务端为准）。
if (authState.token) hydrateFromServer().catch(() => {})

createApp(App).use(router).mount('#app')
