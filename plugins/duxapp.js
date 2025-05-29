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
    // 编译结束处理
    ctx.onBuildComplete(() => {
      // 复制模块中的文件
      const apps = util.getApps()
      apps.forEach(app => {
        const copyDir = file.pathJoin('src', app, 'update', 'copy.build.complete')
        if (fs.existsSync(copyDir)) {
          file.copy(copyDir, '.')
        }
      })

      // 复制配置中的文件
      const configName = util.getConfigName()
      const copyDir = file.pathJoin('configs', configName, 'copy.build.complete')
      if (fs.existsSync(copyDir)) {
        file.copy(copyDir, '.')
      }
    })
    // 鸿蒙端
    // if (process.env.TARO_ENV === 'harmony_cpp') {
    //   ctx.onBuildFinish(() => {
    //     const icons = util.getApps().map(app => {
    //       if (!fs.existsSync(file.pathJoin(`src/${app}/components`))) {
    //         return []
    //       }
    //       return file.dirList(`src/${app}/components`).filter(dir => {
    //         return dir.endsWith('Icon') && fs.existsSync(file.pathJoin(`src/${app}/components/${dir}/${dir}.ttf`))
    //       }).map(dir => [app, dir])
    //     }).flat()

    //     const appets = 'dist/harmony/entry/src/main/ets/app.ets'
    //     const appLines = file.readFile(appets).split(/\r?\n/)

    //     const content = {
    //       import: 'import { font } from "@kit.ArkUI"',
    //       fonts: `      'duxapp-cli-create-icon';${JSON.stringify(icons)}.forEach((icon) => { font.registerFont({ familyName: icon[1], familySrc: \`/resources/base/media/\${icon[0]}_components_\${icon[1]}_\${icon[1]}.ttf\` })})`
    //     }
    //     // 导入
    //     if (appLines[0] !== content.import) {
    //       appLines.unshift(content.import)
    //     }

    //     // 加载
    //     const loadContentIndex = appLines.findIndex(line => line.startsWith('    stage.loadContent(\''))
    //     if (~loadContentIndex) {
    //       const isAdd = appLines[loadContentIndex + 1].startsWith("      'duxapp-cli-create-icon';")
    //       if (isAdd) {
    //         appLines[loadContentIndex + 1] = content.fonts
    //       } else {
    //         appLines.splice(loadContentIndex + 1, 0, content.fonts)
    //       }
    //     }
    //     file.writeFile(appets, appLines.join('\n'))
    //   })
    // }
  }
})()
