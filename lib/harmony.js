/* eslint-disable import/no-commonjs */
const fs = require('fs')
const file = require('./file')
const util = require('./util')

/**
 * 鸿蒙相关操作
 * @app
 */
module.exports = {
  /**
   * 创建鸿蒙模板文件，通常这不需要你手动操作
   */
  create() {
    const apps = util.getApps()
    const configName = util.getConfigName()

    // 打包生成的配置
    const buildConfigPath = file.pathJoin('dist/duxapp.json')
    const buildConfig = (fs.existsSync(buildConfigPath) && JSON.parse(file.readFile(buildConfigPath))) || {}

    const configPath = file.pathJoin('configs', configName, 'duxapp.harmony.js')
    if (!fs.existsSync(configPath)) {
      console.log(`${configName}/duxapp.harmony.js配置文件不存在 请在配置文件夹中创建`)
      process.exit(1)
    }
    const duxappConfig = require(configPath)
    if (!duxappConfig.appid) {
      console.log('请配置 appid')
      process.exit(1)
    }

    /**
     * 复制文件
     */
    if (!buildConfig.harmony) {
      buildConfig.harmony = {}
    }
    const newBuild = !buildConfig.harmony.buildApps || buildConfig.harmony.buildApps.join() !== apps.join()
    try {
      if (newBuild) {
        file.delete('dist/harmony')
      }
    } catch (error) {
      console.log(`dist/harmony 目录无法删除，请手动清理后重试`, error)
    }
    const tempList = 'src/duxappHarmony/template'

    if (!file.existsSync(tempList)) {
      console.log('请安装最新版的 duxappHarmony 模块后重试')
      process.exit(1)
    }

    file.copy(tempList, 'dist/harmony')

    buildConfig.harmony.buildApps = apps

    // 用户配置开始生命周期
    duxappConfig.onStart?.()

    // 传递给回调钩子的参数
    const hookData = {
      apps,
      configName,
      config: duxappConfig
    }

    /**
     * 模块处理
     */
    const configs = apps.map(app => {
      const configPath = file.pathJoin('src', app, 'update', 'harmony.js')

      // 复制模块文件
      const copyPath = file.pathJoin('src', app, 'update', 'copy.harmony')
      if (fs.existsSync(copyPath)) {
        file.copy(copyPath, 'dist/harmony')
      }

      if (fs.existsSync(configPath)) {
        let config = require(configPath)
        if (typeof config === 'function') {
          config = config(hookData)
        }
        /**
         * 开始钩子
         */
        config?.onStart?.()
        return config
      }
    }).filter(v => v)

    // app名称
    file.editFile('dist/harmony/entry/src/main/resources/base/element/string.json', content => {
      content = JSON.parse(content)
      content.string.some(v => {
        if (v.name === 'EntryAbility_label') {
          v.value = duxappConfig.appName
          return true
        }
      })
      return JSON.stringify(content, null, 2)
    })

    // 包名、版本
    jsonExec.json('AppScope/app.json5', {
      app: {
        bundleName: duxappConfig.appid,
        versionCode: duxappConfig.versionCode || 1,
        versionName: duxappConfig.versionName || '1.0.0'
      }
    })

    configs.forEach(config => {
      // 创建文件
      if (config.create) {
        Object.keys(config.create).forEach(filePath => {
          file.writeFile(filePath, config.create[filePath])
        })
      }
      // 处理配置文件
      if (config.json) {
        Object.keys(config.json).forEach(key => {
          jsonExec.json(key, config.json[key])
        })
      }
    })

    jsonExec.jsonWrit()

    const userCopyPath = file.pathJoin(`configs/${configName}/copy.harmony`)
    if (fs.existsSync(userCopyPath)) {
      file.copy(userCopyPath, 'dist/harmony')
    }

    /**
     * 结束钩子
     */
    configs.forEach(v => v?.onStop?.())
    // 用户配置结束生命周期
    duxappConfig.onStop?.()

    /**
     * 写入配置文件
     */
    file.writeFile(buildConfigPath, JSON.stringify(buildConfig, null, 2))
  },

}

const jsonExec = {
  jsonContent: {},
  json(name, content) {
    let base = this.jsonContent[name]
    if (!base) {
      const filePath = file.pathJoin(`dist/harmony/${name}`)
      if (fs.existsSync(filePath)) {
        base = JSON.parse(file.readFile(filePath) || {})
      } else {
        base = {}
      }
      this.jsonContent[name] = base
    }

    util.objectMerge(base, content)
  },
  jsonWrit() {
    Object.keys(this.jsonContent).forEach(key => {
      file.writeFile(`dist/harmony/${key}`, JSON.stringify(this.jsonContent[key], null, 2))
    })
  }
}
