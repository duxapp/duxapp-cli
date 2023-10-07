const { readdirSync, lstatSync, readFileSync, writeFileSync, existsSync, statSync, unlinkSync, rmdirSync } = require('fs')
const { join } = require('path')
const { parse } = require('@babel/parser')
const util = require('./util');

const appRoot = process.cwd()

const getPath = (...dirs) => join(appRoot, ...dirs)

const enterFile = (() => {

  // 禁用的app模块
  const disableApp = ['main', 'redux', 'components', 'utils', 'config', 'static']

  const getDirs = (...dirs) => readdirSync(getPath(...dirs))
    .filter(file => {
      const stat = lstatSync(getPath('src', file))
      return stat.isDirectory()
    })

  const editFile = (path, callback) => {
    const filePath = getPath(path)
    if (!existsSync(filePath)) {
      writeFileSync(filePath, '', { encoding: 'utf8' })
    }
    const data = readFileSync(filePath, { encoding: 'utf8' })
    const newData = callback(data)
    newData !== data && writeFileSync(filePath, newData, { encoding: 'utf8' })
  }

  const getAppConfig = apps => {
    return Object.fromEntries(apps.map(name => [
      name,
      require(getPath('src', name, 'app.json'))
    ]))
  }

  const astToObject = ast => {
    if (typeof ast !== 'object') {
      return ast
    } else if (ast.type === 'ObjectExpression') {
      const data = {}
      ast.properties.forEach(item => {
        data[item.key.name || item.key.value] = astToObject(item.value)
      })
      return data
    } else if (ast.type === 'ArrayExpression') {
      return ast.elements.map(item => astToObject(item.value))
    } else if (ast.type === 'Property') {
      return astToObject(ast.value)
    } else if (ast.type === 'Literal') {
      return ast.value
    } else {
      return ast.value
    }
  }

  // 将用户配置转换为对象并返回
  const getAppUserConfig = configName => {
    const data = readFileSync(getPath('src', 'duxapp' + (configName ? '.' + configName : '') + '.js'), { encoding: 'utf8' })
    const ast = parse(data, { sourceType: 'module' })

    let config = {}
    const configInit = ast.program.body.find(item => item.type === 'VariableDeclaration' && item.kind === 'const' && item.declarations[0]?.id?.name === 'config')?.declarations[0]?.init
    if (configInit) {
      config = astToObject(configInit)
    }
    return config
  }

  const createTaroEntry = (apps, configName) => {
    editFile(join('src', 'duxappTaroEntry.js'), () => {
      const config = getAppUserConfig(configName)
      delete config.option
      return `const config = ${JSON.stringify(config, null, 2)}

module.exports = config
`
    })
  }

  const createRoute = apps => {
    const template = `/* eslint-disable import/no-commonjs */
/**
 * 路由入口文件
 * 此文件由duxapp自动生成，请勿修改
 */
${apps.map(app => `const ${app} = require('./${app}/config/route')`).join('\r')}

module.exports = {
  ${apps.join(',\r  ')}
}
`
    editFile(join('src', 'route.js'), () => template)
  }

  const createEnter = (apps, configName) => {
    // 主题处理
    const themeApps = apps.filter(app => {
      return existsSync(getPath('src', app, 'config', 'theme.js'))
    })
    // 开启调试模式
    const config = getAppUserConfig(configName)
    const template = `/**
 * 模块入口文件
 * 此文件由duxapp自动生成 请勿修改
 */
import { registerPages, setAppTheme } from '@/duxapp/utils'

${apps.map(app => `import { appLifecycle as ${app} } from '@/${app}/app'`).join('\r')}

${themeApps.map(app => `import ${app}Theme from '@/${app}/config/theme'`).join('\r')}

import config from './duxappEntry'
import route from './route'
${config.debug?.vconsole ? `
if (process.env.TARO_ENV === 'h5') {
  const VConsole = require('vconsole')
  const vConsole = new VConsole()
}
`: ''}
// 注册路由
registerPages(route, config)

const apps = { ${apps.join(', ')} }
const appThemes = { ${themeApps.map(app => `${app}: ${app}Theme`).join(', ')} }

Object.keys(apps).forEach(name => {
  const option = config.option?.[name] || {}
  apps[name].option?.(option)
  if (option.theme && appThemes[name]) {
    setAppTheme(option.theme, appThemes[name])
  }
})

const exec = (name, ...arg) => {
  Object.values(apps).forEach(app => {
    app[name]?.(...arg)
  })
}

export const effect = () => {
  exec('effect')
}

export const launch = option => {
  exec('launch', option)
}

export const show = option => {
  exec('show', option)
}

export const hide = () => {
  exec('hide')
}
`
    editFile(join('src', 'init.js'), () => template)
    const duxappTemplate = `/**
 * 配置入口文件
 * 此文件由duxapp自动生成 请勿修改
 */
import config from './duxapp${configName ? '.' + configName : ''}'

export default config
`
    editFile(join('src', 'duxappEntry.js'), () => duxappTemplate)
  }

  const createCommonScss = (apps, configName) => {
    apps = [...apps]
    const { option } = getAppUserConfig(configName)
    let scss = ''
    // 将duxapp排在第一个
    const duxappIndex = apps.indexOf('duxapp')
    if (duxappIndex > 0) {
      apps.unshift(apps.splice(duxappIndex, 1)[0])
    }
    apps.map(app => {
      const filePath = getPath('src', app, 'config', 'themeToScss.js')
      if (existsSync(filePath)) {
        scss += require(filePath)(option?.[app]?.theme || {}) + '\n\n'
      }
    })
    editFile(join('src', 'theme.scss'), () => scss)
  }

  return () => {
    // 获取app列表
    let apps = getDirs('src').filter(name => !disableApp.includes(name))
    // 筛选命令行中指定的app
    const customAppsArgv = util.getArgv().find(item => item.startsWith('--apps='))
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
    // 筛选命令行中指定的app
    const configArgv = util.getArgv().find(item => item.startsWith('--appConfig='))
    let configName = 'default'
    if (configArgv) {
      configName = configArgv.split('=')[1]
    } else if (customAppsArgv) {
      configName = customAppsArgv.split('=')[1].split(',')[0]
    }
    if (configName && !existsSync(getPath('src', 'duxapp.' + configName + '.js'))) {
      configName = 'default'
    }
    createTaroEntry(apps, configName)
    createRoute(apps)
    createEnter(apps, configName)
    createCommonScss(apps, configName)
  }
})();

/**
 * 通过配置和隐射编辑配置文件的相关配置
 */
const editConfig = (() => {

  const replaceRange = (str, start, end, replacement) => {
    if (start < 0 || start >= str.length || end < start || end > str.length) {
      throw new Error("Invalid range");
    }

    return str.substring(0, start) + replacement + str.substring(end);
  }

  const setValue = (list, data, value, mapping) => {
    if (!Array.isArray(list)) {
      console.log('ast结构错误', list)
      return data
    }
    const key = mapping[0]
    const item = list.find(v => v.key.name === key)
    if (item && mapping.length === 1) {
      // 找到值，设置值
      if (typeof item !== 'object') {
        console.log('设置错误的值', item)
        return data
      } else if (typeof value === 'string') {
        return replaceRange(data, item.value.start, item.value.end, `'${value}'`)
      } else {
        return replaceRange(data, item.value.start, item.value.end, value)
      }
    } else if (item && mapping.length > 0) {
      // 或者后面将数组处理为带key的形式
      return setValue(item.value?.properties || item.value?.elements?.map((v, i) => ({ key: { name: i }, value: v })), data, value, mapping.slice(1))
    } else {
      return data
    }
  }

  const edit = (data, config, mapping) => {
    for (const key in config) {
      if (Object.hasOwnProperty.call(config, key)) {
        const value = config[key]
        if (value === '' || value === null) {
          // 空字符串不写入 或者值为null
          continue
        }
        const mappingItem = mapping[key]
        if (typeof value === 'object' && typeof mappingItem === 'object') {
          data = edit(data, value, mappingItem)
        } else if (mappingItem) {
          mappingItem.forEach(_mapping => {
            const ast = parse(data, { sourceType: 'module' })
            const list = ast.program.body
              .filter(v => v.type === 'VariableDeclaration')
              .map(v => v.declarations)
              .flat()
              .map(v => ({
                key: v.id,
                value: v.init
              }))
            data = setValue(list, data, value, _mapping)
          })

        }
      }
    }
    return data
  }

  return (config, mapping, input, output) => {
    let fileDir
    if (!input) {
      let configName
      // 筛选命令行中指定的app
      const customAppsArgv = util.getArgv().find(item => item.startsWith('--apps='))
      const configArgv = util.getArgv().find(item => item.startsWith('--appConfig='))
      if (configArgv) {
        configName = configArgv.split('=')[1]
      } else if (customAppsArgv) {
        configName = customAppsArgv.split('=')[1].split(',')[0]
      }
      if (configName && !existsSync(getPath('src', 'duxapp.' + configName + '.js'))) {
        configName = ''
      }
      fileDir = getPath('src', configName ? 'duxapp.' + configName + '.js' : 'duxapp.js')
    } else {
      fileDir = getPath('src', input)
    }
    const data = readFileSync(fileDir, { encoding: 'utf8' })
    writeFileSync(output ? getPath('src', output) : fileDir, edit(data, config, mapping), { encoding: 'utf8' })
  }
})();

module.exports = {
  enterFile,
  editConfig
}