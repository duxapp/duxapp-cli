import fs from 'fs'

import runtime from '../lib/runtime.js'
import { getApps, getConfigName, getEntryApp } from '../lib/util.js'
import { pathJoin, copy } from '../lib/file.js'

const { enterFile } = runtime

/**
 * duxapp框架插件
 */
export default ctx => {
  if (process.env.NODE_ENV === 'development') {
    ctx.onBuildStart(async () => {
      // 监听模块、用户配置等文件的创建或者修改，动态更新
      const apps = await getApps()
      const configName = await getConfigName()
      const entryApp = await getEntryApp()
      let initialStats
      setTimeout(() => {
        initialStats = true
      }, 500)
      if (entryApp) {
        // 监听入口模块的 index.html文件
        fs.watchFile(pathJoin('src', entryApp, 'index.html'), () => {
          if (!initialStats) {
            return
          }
          enterFile.createIndexEntry()
        })
      }
      // 监听用户配置修改后创建主题scss
      fs.watchFile(pathJoin('configs', configName, 'index.js'), () => {
        if (!initialStats) {
          return
        }
        enterFile.createCommonScss(apps, configName)
      })
      // 监听模块全局文件
      apps.forEach(app => {
        // 监听全局样式
        fs.watchFile(pathJoin('src', app, 'app.scss'), () => {
          if (!initialStats) {
            return
          }
          enterFile.createAppScss(apps)
        })
        // 路由
        fs.watchFile(pathJoin('src', app, 'router.js'), (curr, prev) => {
          if (!initialStats) {
            return
          }
          if (curr.ctime !== prev.ctime) {
            enterFile.createConfigEntry(apps, configName)
            enterFile.createAppEntry(apps, configName)
          }
        })
        // 入口文件
        fs.watchFile(pathJoin('src', app, 'app.js'), (curr, prev) => {
          if (!initialStats) {
            return
          }
          if (curr.ctime !== prev.ctime) {
            enterFile.createAppEntry(apps, configName)
          }
        })
        // app.config.js
        fs.watchFile(pathJoin('src', app, 'app.config.js'), (curr, prev) => {
          if (!initialStats) {
            return
          }
          if (curr.ctime !== prev.ctime) {
            enterFile.createConfigEntry(apps, configName)
          }
        })
      })
    })
  }
  // 编译结束处理
  ctx.onBuildComplete(async () => {
    // 复制模块中的文件
    const apps = await getApps()
    apps.forEach(app => {
      const copyDir = pathJoin('src', app, 'update', 'copy.build.complete')
      if (fs.existsSync(copyDir)) {
        copy(copyDir, '.')
      }
    })

    // 复制配置中的文件
    const configName = await getConfigName()
    const copyDir = pathJoin('configs', configName, 'copy.build.complete')
    if (fs.existsSync(copyDir)) {
      copy(copyDir, '.')
    }
  })
}
