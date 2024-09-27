const fs = require('fs')
const { enterFile } = require('../lib/runtime')
const util = require('../lib/util')
const file = require('../lib/file')

/**
 * duxapp框架插件
 */
module.exports = (() => {
  return ctx => {
    if (process.env.NODE_ENV === 'development') {
      ctx.onBuildStart(() => {
        // 监听模块、用户配置等文件的创建或者修改，动态更新
        const apps = util.getApps()
        const configName = util.getConfigName()
        const entryApp = util.getEntryApp()
        let initialStats
        setTimeout(() => {
          initialStats = true
        }, 500)
        if (entryApp) {
          // 监听入口模块的 index.html文件
          fs.watchFile(file.pathJoin('src', entryApp, 'index.html'), () => {
            if (!initialStats) {
              return
            }
            enterFile.createIndexEntry()
          })
        }
        // 监听用户配置修改后创建主题scss
        fs.watchFile(file.pathJoin('configs', configName, 'index.js'), () => {
          if (!initialStats) {
            return
          }
          enterFile.createCommonScss(apps, configName)
        })
        // 监听模块全局文件
        apps.forEach(app => {
          // 监听全局样式
          fs.watchFile(file.pathJoin('src', app, 'app.scss'), () => {
            if (!initialStats) {
              return
            }
            enterFile.createAppScss(apps)
          })
          // 路由
          fs.watchFile(file.pathJoin('src', app, 'router.js'), (curr, prev) => {
            if (!initialStats) {
              return
            }
            if (curr.ctime !== prev.ctime) {
              enterFile.createConfigEntry(apps, configName)
              enterFile.createAppEntry(apps, configName)
            }
          })
          // 入口文件
          fs.watchFile(file.pathJoin('src', app, 'app.js'), (curr, prev) => {
            if (!initialStats) {
              return
            }
            if (curr.ctime !== prev.ctime) {
              enterFile.createAppEntry(apps, configName)
            }
          })
          // app.config.js
          fs.watchFile(file.pathJoin('src', app, 'app.config.js'), (curr, prev) => {
            if (!initialStats) {
              return
            }
            if (curr.ctime !== prev.ctime) {
              enterFile.createConfigEntry(apps, configName)
            }
          })
          // babel.config.js
          fs.watchFile(file.pathJoin('src', app, 'babel.config.js'), (curr, prev) => {
            if (!initialStats) {
              return
            }
            if (curr.ctime !== prev.ctime) {
              enterFile.createBableEntry(apps)
            }
          })
          // metro.config.js
          fs.watchFile(file.pathJoin('src', app, 'metro.config.js'), (curr, prev) => {
            if (!initialStats) {
              return
            }
            if (curr.ctime !== prev.ctime) {
              enterFile.createMetroEntry(apps)
            }
          })
        })
      })
    }
  }
})()
