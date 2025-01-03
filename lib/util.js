/* eslint-disable import/no-commonjs */
const fs = require('fs')
const os = require('os')
const { join } = require('path')
const { exec, spawn } = require('child_process')
const file = require('./file')

const disableApp = ['main', 'redux', 'components', 'utils', 'config', 'static', 'configs', 'node_modules', 'npm', 'taro', 'configs']

module.exports = {
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

    const fileName = file.pathJoin('configs', configName, 'duxapp.rn.js')

    if (!fs.existsSync(fileName)) {
      if (exit) {
        console.log('请在项目配置目录下创建duxapp.rn.js配置文件')
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
        code ? reject(`cmd 运行错误，检查上面的错误信息: ${cmd}`) : resolve()
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
  getEntryApp(getAll) {
    const apps = file.dirList('src').filter(name => !disableApp.includes(name))
    // 筛选命令行中指定的app
    const customAppsArgv = util.getArgv().find(item => item.startsWith('--app='))

    if (customAppsArgv) {
      const customApps = customAppsArgv.split('=')[1].split(',').filter(app => apps.includes(app))
      if (!customApps.length) {
        throw new Error('无效的 --app=参数')
      }
      return getAll ? customApps : customApps[0]
    } else {
      throw new Error('请通过 --app= 参数指定一个模块作为入口')
    }
  },
  /**
   * 获取关联的app
   */
  getApps(startApps = util.getEntryApp(true)) {
    return flattenDependencies(getAppDependencies(), startApps)
  },
  objectMarge(oldData, newData) {
    for (const key in newData) {
      if (Object.hasOwnProperty.call(newData, key)) {
        const oldItem = oldData[key]
        const item = newData[key]
        if (item instanceof Array) {
          if (oldItem instanceof Array) {
            oldData[key] = [
              ...oldItem,
              ...item.filter(v => {
                return oldItem.every(oldv => !deepEqua(v, oldv))
              })
            ]
          } else {
            oldData[key] = item
          }
        } else if (item && typeof item === 'object') {
          if (!oldItem || typeof oldItem !== 'object') {
            oldData[key] = item
          } else {
            util.objectMarge(oldItem, item)
          }
        } else {
          oldData[key] = item
        }
      }
    }
  },
  disableApp
}

const getPath = (...dirs) => join(process.cwd(), ...dirs)

/**
 * 获取所有模块的依赖
 */
const getAppDependencies = () => {

  const apps = file.dirList('src').filter(name => !disableApp.includes(name))

  return Object.fromEntries(apps.map(name => {
    const jsonPath = getPath('src', name, 'app.json')
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`${name} 模块的配置文件(app.json)不存在，请检查模块是否完善`)
    }

    const config = require(jsonPath)

    if (config.name !== name) {
      throw new Error(`模块目录名称${name}，与模块配置中的名称不匹配(${config.name})，请修改让他们保持一致`)
    }

    return [
      name,
      config.dependencies || []
    ]
  }))
}

/**
 * 获取依赖
 * @param {*} modules
 * @param {*} startModules
 */
const flattenDependencies = (modules, startModules) => {
  const result = []
  const visited = new Set()

  // 深度优先搜索遍历模块依赖
  function dfs(module, parent) {
    if (visited.has(module)) return
    visited.add(module)

    // 递归遍历模块的依赖
    if (modules[module]) {
      for (const dependency of modules[module]) {
        dfs(dependency, module)
      }
    } else {
      throw new Error(`${parent} 模块依赖中的 ${module} 模块不存在，你可以尝试安装或者创建 ${module} 模块`)
    }

    // 将模块加入结果数组（放在依赖之后）
    result.push(module)
  }

  // 从每个入口模块开始遍历
  for (const module of startModules) {
    dfs(module)
  }

  return result
}

const deepEqua = (a, b) => {
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = [Object.keys(a), Object.keys(b)]
    if (keys[0].length !== keys[1].length) {
      return false
    }
    return keys[0].every(k => deepEqua(a[k], b[k]))
  } else {
    return a === b
  }
}
