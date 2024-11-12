/* eslint-disable import/no-commonjs */
const fs = require('fs')
const file = require('./file')
const util = require('./util')

module.exports = {
  create() {
    const apps = util.getApps()
    const configName = util.getConfigName()

    // 打包生成的配置
    const buildConfigPath = file.pathJoin('dist/duxapp.json')
    const buildConfig = (fs.existsSync(buildConfigPath) && JSON.parse(file.readFile(buildConfigPath))) || {}

    const configPath = file.pathJoin('configs', configName, 'duxapp.js')
    if (!fs.existsSync(configPath)) {
      console.log('duxapp.js配置文件不存在 请创建')
      process.exit()
    }
    const duxappConfig = require(configPath)
    if (!duxappConfig.android?.appid) {
      console.log('请配置 harmonyEts.appid')
      process.exit()
    }

    /**
     * 复制文件
     */
    if (!buildConfig.harmonyEts) {
      buildConfig.harmonyEts = {}
    }
    const newBuild = !buildConfig.harmonyEts.buildApps || buildConfig.harmonyEts.buildApps.join() !== apps.join()
    try {
      if (newBuild) {
        file.dirAndFileList('harmony-ets').forEach(name => {
          file.delete('harmony-ets/' + name)
        })
      }
    } catch (error) {
      console.log(`harmony-ets 目录无法删除，请手动清理后重试`, error)
    }
    const tempList = 'node_modules/duxapp-cli/harmonyEtsTemplate'
    file.dirAndFileList(tempList).forEach(name => {
      file.copy(tempList + '/' + name, `harmony-ets/${name}`)
    })

    buildConfig.harmonyEts.buildApps = apps

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
      const configPath = file.pathJoin('src', app, 'update', 'index.js')

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

    configs.forEach(config => {
      // 处理配置文件
      // if (config.harmonyEts?.json) {
      //   Object.keys(config.android.xml).forEach(key => {
      //     harmonyExec.json(key, config.android.xml[key])
      //   })
      // }
    })

    /**
     * 结束钩子
     */
    configs.forEach(v => v?.onStop?.())

    /**
     * 写入配置文件
     */
    file.writeFile(buildConfigPath, JSON.stringify(buildConfig, null, 2))
  },

}

