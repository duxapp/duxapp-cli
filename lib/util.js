/* eslint-disable import/no-commonjs */
const fs = require('fs')
const os = require('os')
const { join } = require('path')
const { exec, spawn } = require('child_process')
const file = require('./file')

const util = {
  /**
   * 判断当前操作系统
   */
  os() {
    const type = os.type()
    switch (type) {
      case 'Windows_NT':
        return 'Windows'
      default:
        return type
    }
  },
  randomString(len = 16) {
    len = len || 32
    const $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678'    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
    const maxPos = $chars.length
    let pwd = ''
    for (let i = 0; i < len; i++) {
      pwd += $chars.charAt(Math.floor(Math.random() * maxPos))
    }
    return pwd
  },
  json: {
    get(filename) {
      const data = fs.readFileSync(file.pathJoin(filename), { encoding: 'utf8' })
      return JSON.parse(data)
    },
    set(filename, content) {
      fs.writeFileSync(file.pathJoin(filename), JSON.stringify(content, null, 2), { encoding: 'utf8' })
    }
  },
  projectName() {
    return util.json.get('package.json').name
  },
  config(keys = [], exit = true) {

    const configName = util.getConfigName()

    const fileName = file.pathJoin('configs', configName, 'duxapp.js')

    if (!fs.existsSync(fileName)) {
      if (exit) {
        console.log('请在项目配置目录下创建duxapp.js配置文件')
        process.exit(1)
      }
      return
    }
    const config = require(fileName)
    const res = util.recursionGetValue(keys, config)
    if (res === undefined) {
      if (exit) {
        console.log('请配置', keys.join('.'))
        process.exit(1)
      }
      return
    }
    return res
  },
  recursionGetValue(keys, data = {}, childKey, splice = false) {
    keys = typeof keys === 'string' ? keys.split('.') : [...keys]
    if (keys.length === 0) {
      return false
    } if (keys.length === 1) {
      return splice ? data.splice(keys[0], 1)[0] : data[keys[0]]
    } else {
      return util.recursionGetValue(keys.slice(1), childKey === undefined ? data[keys[0]] : data[keys[0]][childKey], childKey, splice)
    }
  },
  asyncExec(...cmds) {
    return new Promise((resolve, reject) => {
      const callback = prevInfo => {
        if (!cmds.length) {
          resolve(prevInfo)
          return
        }
        const item = cmds.shift()
        exec(item, {
          maxBuffer: 100 * 1024 * 1024,
        }, (error, info) => {
          if (error) {
            reject(error)
          } else {
            callback(info)
          }
        })
      }
      callback()
    })
  },
  asyncSpawn(cmd, option) {
    return new Promise((resolve, reject) => {
      const [_cmd, ..._option] = cmd.split(' ')
      const task = spawn(_cmd, _option, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        ...option
      })

      task.on('error', (data) => {
        reject(data)
      })

      task.on('close', (code) => {
        resolve(code)
      })
    })
  },
  getArgv() {
    const npm_config_argv = process.env?.npm_config_argv
    const argv = npm_config_argv ? JSON.parse(process.env.npm_config_argv)?.original : []
    return [...process.argv, ...argv]
  },

  // 获取配置文件名
  getConfigName(appName = util.getArgv().find(item => item.startsWith('--app='))) {
    // 筛选命令行中指定的app
    const configArgv = util.getArgv().find(item => item.startsWith('--config='))
    let configName = 'default'
    if (configArgv) {
      configName = configArgv.split('=')[1]
    } else if (appName) {
      configName = appName.split('=')[1].split(',')[0]
    }
    if (configName && !fs.existsSync(join(process.cwd(), 'configs', configName, 'index.js'))) {
      configName = 'default'
    }
    return configName
  },
  /**
   * 获取入口app
   */
  getEntryApp() {
    const customAppsArgv = util.getArgv().find(item => item.startsWith('--app='))
    if (customAppsArgv) {
      const customApps = customAppsArgv.split('=')[1].split(',')
      return customApps[0]
    }
  },
  /**
   * 获取关联的app
   */
  getApps() {

    // 禁用的app模块
    const disableApp = ['main', 'redux', 'components', 'utils', 'config', 'static']

    const getDirs = (...dirs) => fs.readdirSync(getPath(...dirs))
      .filter(file => {
        const stat = fs.lstatSync(getPath('src', file))
        return stat.isDirectory()
      })

    const getAppConfig = apps => {
      return Object.fromEntries(apps.map(name => [
        name,
        require(getPath('src', name, 'app.json'))
      ]))
    }

    // 获取app列表
    let apps = getDirs('src').filter(name => !disableApp.includes(name))
    // 筛选命令行中指定的app
    const customAppsArgv = util.getArgv().find(item => item.startsWith('--app='))
    if (customAppsArgv) {
      const customApps = customAppsArgv.split('=')[1].split(',')
      const configs = getAppConfig(apps)
      // 检查模块依赖
      const getDependencies = (name, list = []) => {
        if (!configs[name]) {
          throw 'app配置文件不存在:' + name + '/' + 'app.json'
        }
        if (!list.includes(name)) {
          list.unshift(name)
        }
        const { dependencies } = configs[name]
        if (dependencies.length) {
          dependencies.forEach(childName => {
            getDependencies(childName, list)
          })
        }
        return list
      }

      apps = [...new Set(customApps.map(name => getDependencies(name)).flat())]
    }
    return apps
  }
}

module.exports = util


const getPath = (...dirs) => join(process.cwd(), ...dirs)
