import fs from 'fs'
import nodeos from 'os'
import { join } from 'path'
import { exec, spawn } from 'child_process'
import * as file from './file.js'

export const disableApp = ['main', 'redux', 'components', 'utils', 'config', 'static', 'configs', 'node_modules', 'npm', 'taro', 'configs']

/**
 * 判断当前操作系统
 */
export const os = () => {
  const type = nodeos.type()
  switch (type) {
    case 'Windows_NT':
      return 'Windows'
    default:
      return type
  }
}

export const randomString = (len = 16) => {
  len = len || 32
  const $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678'    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
  const maxPos = $chars.length
  let pwd = ''
  for (let i = 0; i < len; i++) {
    pwd += $chars.charAt(Math.floor(Math.random() * maxPos))
  }
  return pwd
}

export const asyncSpawn = (cmd, option) => {
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
}

/**
 * 在新的终端窗口中，在指定目录下执行命令
 * @param {string} command 要执行的命令，例如 "npm run dev"
 * @param {string} absDir 要切换到的目录
 */
export const runInTerminal = (command, absDir = file.pathJoin('.')) => {
  const platform = process.platform

  if (platform === 'darwin') {
    // macOS: 创建 .command 文件并用 open 打开
    const fullCommand = `cd "${absDir}" && ${command}`
    const scriptPath = join(nodeos.tmpdir(), `run-${Date.now()}.command`)
    const scriptContent = `#!/bin/bash\n${fullCommand}\n`
    fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 }) // 可执行
    exec(`open "${scriptPath}"`)
  } else if (platform === 'win32') {
    // Windows: 用 cmd 打开新窗口并执行命令
    exec(`start "" cmd.exe /K "cd /d \\"${absDir}\\" && ${command}"`)
  } else if (platform === 'linux') {
    // Linux: 用 gnome-terminal 执行命令
    exec(`gnome-terminal -- bash -c "cd '${absDir}' && ${command}; exec bash"`)
  } else {
    console.error('❌ 不支持的平台:', platform)
  }
}

export const getArgv = async () => {
  const duxappParams = {}
  const duxappArgv = []
  const duxappRoute = []
  const otherArgv = []
  const duxappNames = ['app', 'config']
  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const name = duxappNames.find(key => arg.startsWith(`--${key}=`) || arg === `--${key}`)
    if (name) {
      if (arg === `--${name}`) {
        const next = args[i + 1]
        if (next && !next.startsWith('-')) {
          i++
          duxappParams[name] = args[i]
          duxappArgv.push(`--${name}=${args[i]}`)
        }
      } else {
        duxappParams[name] = arg.split('=')[1]
        duxappArgv.push(arg)
      }
    } else if (arg === '-h' || arg === '--help') {
      duxappParams.help = true
    } else if (arg.startsWith('-')) {
      if (arg.includes('=')) {
        otherArgv.push(arg)
      } else {
        otherArgv.push(arg)
        const next = args[i + 1]
        if (next && !next.startsWith('-')) {
          otherArgv.push(args[++i])
        }
      }
    } else {
      duxappRoute.push(arg)
    }
  }
  if (!duxappRoute.length) {
    duxappParams.help = true
  } else if (duxappRoute.length === 1) {
    const jsPath = join(file.getDirname(import.meta.url || __dirname), duxappRoute[0] + '.js')
    if (fs.existsSync(jsPath)) {
      const lib = await importjs(jsPath)
      if (!lib._index) {
        duxappParams.help = true
      }
    }
  }
  return {
    route: duxappRoute,
    params: duxappParams,
    argv: duxappArgv,
    otherArgv: otherArgv
  }
}

// 获取配置文件名
export const getConfigName = async appName => {
  // 筛选命令行中指定的app
  const params = (await getArgv()).params
  let configName = 'default'
  if (appName === undefined) {
    appName = params.app
  }
  if (params.config) {
    configName = params.config
  } else if (appName) {
    configName = appName
  } else if (isTaro()) {
    const name = getBuildConfig().configName
    if (name) {
      configName = name
    }
  }
  if (configName && !fs.existsSync(file.pathJoin('configs', configName, 'index.js'))) {
    configName = 'default'
  }
  return configName
}

/**
 * 获取所有可用app
 */
export const getAllApps = () => {
  return file.dirList('src').filter(name => {
    const disable = disableApp.includes(name)
    if (disable) {
      console.log(`模块: ${name} 是禁止使用的，请重更换其他名称`)
    }
    return !disable
  })
}

/**
 * 获取入口app
 */
export const getEntryApp = async getAll => {
  const apps = getAllApps()
  // 筛选命令行中指定的app
  const userApps = (await getArgv()).params.app

  if (userApps) {
    const customApps = userApps.split(',').filter(app => apps.includes(app))
    if (!customApps.length) {
      throw new Error('无效的 --app 参数：' + userApps + ' 模块不存在')
    }
    return getAll ? customApps : customApps[0]
  } else if (isTaro()) {
    const customApps = getBuildConfig().entryApp
    if (!customApps?.length) {
      throw new Error('见到这个报错，通常是因为你在执行相关操作之前，未通过duxapp命令指定 --app 参数进行编译导致的')
    }
    return getAll ? customApps : customApps[0]
  } else {
    throw new Error('请通过 --app 参数指定一个模块作为入口')
  }
}

/**
 * 获取关联的app
 */
export const getApps = async startApps => {
  if (typeof startApps === 'undefined') {
    startApps = await getEntryApp(true)
  }
  return flattenDependencies(getAppDependencies(), startApps)
}

export const objectMerge = (oldData, newData) => {
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
          objectMerge(oldItem, item)
        }
      } else {
        oldData[key] = item
      }
    }
  }
}

export const getBuildConfig = () => {
  return (fs.existsSync(buildConfigPath) && JSON.parse(file.readFile(buildConfigPath))) || {}
}
export const setBuildConfig = data => {
  file.writeFile(buildConfigPath, JSON.stringify(data, null, 2))
}
export const mergeBuildConfig = data => {
  const oldData = getBuildConfig()
  setBuildConfig({
    ...oldData,
    ...data
  })
}

export const importjs = async (url, all) => {
  if (!fs.existsSync(url)) {
    throw new Error(`要导入的文件不存在：${url}`)
  }
  try {
    const lib = await import(url)
    if (!all && lib.default) {
      return lib.default
    } else {
      return lib
    }
  } catch (error) {
    console.log(error)
    throw new Error(`动态导入文件失败，请将文件导出转换为 ES6 后重试：${url}`)
  }
}

const isTaro = () => {
  const baseDir = process.cwd().replace(/\\/g, '/')
  const stack = new Error().stack || ''

  // 分解为每一行
  const lines = stack.split('\n')

  for (const line of lines) {
    const pathMatch = line.match(/(?:\(|\s)((?:[A-Za-z]:)?[\\\/][^:)\s]+)(?::\d+:\d+)?\)?/)
    if (!pathMatch) continue

    const filePath = pathMatch[1].replace(/\\/g, '/')

    if (
      filePath.startsWith(`${baseDir}/node_modules`) &&
      !filePath.startsWith(`${baseDir}/node_modules/duxapp-cli`)
    ) {
      return true
    }

    if (
      filePath.startsWith(`${baseDir}/`) &&
      !filePath.startsWith(`${baseDir}/node_modules`)
    ) {
      return true
    }

    if (filePath.startsWith(`${baseDir}/node_modules/duxapp-cli/plugins`)) {
      return true
    }

    if (filePath.startsWith(`${baseDir}/node_modules/duxapp-cli/cjs`)) {
      return true
    }
  }

  return false
}

/**
 * 模块信息存放位置
 */
export const appsInfoPath = 'dist/duxapp-apps-info.json'

const buildConfigPath = file.pathJoin('dist/duxapp.json')

/**
 * 获取所有模块的依赖
 */
const getAppDependencies = () => {

  const apps = getAllApps()

  return Object.fromEntries(apps.map(name => {
    const jsonPath = file.pathJoin('src', name, 'app.json')
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`${name} 模块的配置文件(app.json)不存在，请检查模块是否完善`)
    }

    try {

      const config = JSON.parse(file.readFile(jsonPath))

      if (config.name !== name) {
        throw new Error(`模块目录名称${name}，与模块配置(app.json)中的名称不匹配(${config.name})，请修改让他们保持一致`)
      }

      return [
        name,
        config.dependencies || []
      ]

    } catch (error) {
      console.log(error)
      throw new Error(`${name} 模块的配置文件，不是一个有效的JSON：${jsonPath}`)
    }
  }))
}

/**
 * 获取依赖
 * @param {*} modules
 * @param {*} startModules
 */
export const flattenDependencies = (modules, startModules) => {
  const result = []
  const visited = new Set()

  const installRequire = file.readJson(appsInfoPath).installRequire || {}

  // 深度优先搜索遍历模块依赖
  function dfs(module, parent) {
    if (visited.has(module)) return
    visited.add(module)

    // 递归遍历模块的依赖
    if (modules[module]) {
      for (const dependency of modules[module]) {
        dfs(dependency, module)
      }
    } else if (installRequire[module] && !modules[installRequire[module]]) {
      // 非必要模块
      return
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
