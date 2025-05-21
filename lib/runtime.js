const { readFileSync, writeFileSync, existsSync } = require('fs')
const { join } = require('path')
const { parse } = require('@babel/parser')
const util = require('./util')
const { pathJoin, readFile } = require('./file')
const file = require('./file')
const project = require('./project')

let projectName = ''

const getPath = (...dirs) => join(process.cwd(), projectName, ...dirs)

const enterFile = (() => {

  const readfile = path => {
    const filePath = getPath(path)
    if (!existsSync(filePath)) {
      return ''
    }
    return readFileSync(filePath, { encoding: 'utf8' })
  }

  const editFile = (path, callback) => {
    const filePath = getPath(path)
    if (!existsSync(filePath)) {
      writeFileSync(filePath, '', { encoding: 'utf8' })
    }
    const data = readFileSync(filePath, { encoding: 'utf8' })
    const newData = callback(data)
    newData !== data && writeFileSync(filePath, newData, { encoding: 'utf8' })
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
    const data = readFileSync(getPath('configs', configName, 'index.js'), { encoding: 'utf8' })
    const ast = parse(data, { sourceType: 'module' })

    let config = {}
    const configInit = ast.program.body.find(item => item.type === 'VariableDeclaration' && item.kind === 'const' && item.declarations[0]?.id?.name === 'config')?.declarations[0]?.init
    if (configInit) {
      config = astToObject(configInit)
    }
    return config
  }

  // 获取模块路由 和 模块配置
  const getRouteAndConfig = (apps, getConfig) => {
    const isRoute = app => existsSync(pathJoin('src', app, 'config', 'route.js'))
    const isConfig = app => existsSync(pathJoin('src', app, 'app.config.js'))
    return `${apps.map(app => {
      if (isRoute(app)) {
        return `import ${app}Route from './${app}/config/route'`
      }
    }).filter(v => v).join('\n') + '\n'}${getConfig ? apps.map(app => {
      if (isConfig(app)) {
        return `import ${app}Config from './${app}/app.config'`
      }
    }).filter(v => v).join('\n') + '\n' : ''}
const route = {
  ${apps.map(app => {
      if (isRoute(app)) {
        return `${app}: ${app}Route`
      }
    }).filter(v => v).join(',\n  ')}
}
${getConfig ? `
const configs = {
  ${apps.map(app => {
      if (isConfig(app)) {
        return `${app}Config`
      }
    }).filter(v => v).join(',\n  ')}
}`: ''}`
  }

  // 创建app入口文件
  const createAppEntry = (apps, configName) => {
    // 主题处理
    const themeApps = apps.filter(app => {
      return existsSync(getPath('src', app, 'config', 'theme.js'))
    })
    const entryApps = apps.filter(app => {
      return existsSync(getPath('src', app, 'app.js'))
    })
    // 开启调试模式
    const config = getAppUserConfig(configName)
    const template = `/**
 * 模块入口文件
 * 此文件由duxapp自动生成 请勿修改
 */
import { useDidHide, useDidShow } from '@tarojs/taro'
import { useEffect, Component } from 'react'

import { registerPages, setAppTheme, useLaunch } from './duxapp/utils'

${entryApps.map(app => `import ${app} from './${app}/app'`).join('\n')}

${themeApps.map(app => `import ${app}Theme from './${app}/config/theme'`).join('\n')}

import config from '../configs/${configName}'

import './app.scss'

${getRouteAndConfig(apps)}
${config.debug?.vconsole ? `
if (process.env.TARO_ENV === 'h5') {
  const VConsole = require('vconsole')
  const vConsole = new VConsole()
}
`: ''}
// 注册路由
registerPages(route, config)

const apps = { ${entryApps.join(', ')} }
const appThemes = { ${themeApps.map(app => `${app}: ${app}Theme`).join(', ')} }

Object.keys(apps).forEach(name => {
  apps[name].option?.(config.option?.[name] || {})
})

if (config.option) {
  Object.keys(config.option).forEach(key => {
    const theme = config.option[key].theme
    if (theme && appThemes[key]) {
      setAppTheme(theme, appThemes[key])
    }
  })
}

const exec = (name, ...arg) => {
  Object.values(apps).forEach(app => {
    app[name]?.(...arg)
  })
}

const effect = () => {
  exec('effect')
}

const launch = option => {
  exec('launch', option)
}

const show = option => {
  exec('show', option)
}

const hide = () => {
  exec('hide')
}

const appHoc = (App) => {
  Object.values(apps).forEach(app => {
    if (app.app) {
      App = app.app(App)
    }
  })
  return App
}

class App extends Component {

  onCreate = launch

  componentDidMount = effect

  componentDidShow = show

  componentDidHide = hide

  render() {
    return this.props.children
  }
}

// const App = props => {

//   useEffect(effect, [])

//   useLaunch(launch)

//   useDidShow(show)

//   useDidHide(hide)

//   return props.children
// }

export default appHoc(App)
`
    editFile(join('src', 'app.js'), () => template)
  }

  // 创建入口配置文件
  const createConfigEntry = (apps, configName) => {
    const config = getAppUserConfig(configName)
    delete config.option
    const template = `${getRouteAndConfig(apps, true)}

const marge = (target, source) => {
  if (typeof target !== 'object' || typeof source !== 'object' || target === null || source === null) {
    return source
  }

  for (const key in source) {
    const sourceItem = source[key]
    const targetItem = target[key]
    if (source.hasOwnProperty(key)) {
      if (Array.isArray(sourceItem) && Array.isArray(targetItem)) {
        // 如果是数组类型，将两个数组合并并去重
        sourceItem.forEach(item => {
          if (item && typeof item === 'object') {
            // 转为字符串判断合并
            const itemString = JSON.stringify(item)
            if (!targetItem.some(v => {
              if (v && typeof v === 'object') {
                return JSON.stringify(v) === itemString
              }
            })) {
              targetItem.push(item)
            }
          } else if (!targetItem.includes(item)) {
            targetItem.push(item)
          }
        })

      } else if (typeof sourceItem === 'object' && typeof targetItem === 'object') {
        // 如果是对象类型，递归合并
        target[key] = marge(targetItem, sourceItem)
      } else {
        // 其他类型直接覆盖
        target[key] = sourceItem
      }
    }
  }
  return target
}

const _duxapp = ${JSON.stringify(config, null, 2)}

// eslint-disable-next-line no-undef
const _taroConfig = {
  // 开启动画
  animation: {
    duration: 300
  },
  // h5要在哪个节点渲染
  appId: 'app',
  pages: [],
  subPackages: [],
  window: {
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTextStyle: 'black',
    // 自定义头部
    navigationStyle: 'custom',
    // 禁用页面滚动
    disableScroll: true,
    // 支付宝、抖音导航栏透明
    transparentTitle: 'always'
  },
  rn: {
    useNativeStack: true
  }
}

// 合并模块配置
Object.keys(configs).forEach(key => {
  marge(_taroConfig, configs[key])
})

// 合并用户配置
marge(_taroConfig, _duxapp.appConfig)

const disablePages = [
  ...(_duxapp.disablePages || []),
  ...Object.values(route).map(app => {
    return [
      ...(app.disablePages || []),
      ...Object.keys(app.transfer || {})
    ]
  }).flat()
]

const openPages = [
  ...(_duxapp.openPages || []),
  ...Object.values(route).map(app => app.openPages || []).flat()
]

const pageFilter = item => {
  // 判断平台
  if (item.platform && !item.platform?.includes(process.env.TARO_ENV)) {
    return false
  }
  // 判断是否禁用
  if (disablePages.some(page => item.page.includes(page))) {
    return false
  }
  // 判断默认是否启用
  if (item.disable && !openPages.includes(item.page)) {
    return false
  }
  return true
}

const _pages = Object.values(route).map(v => {
  return Object.entries(v.pages).map(([_path, _config]) => {
    if (v.path) {
      const paths = _path.split('/')
      paths.splice(1, 0, v.path)
      _path = paths.join('/')
    }
    return [_path, _config]
  })
}).flat()

// 首页页面 这些页面将会优先排到前面
const _homePages = []

_taroConfig.pages.push(..._pages
  .map(([key, _config]) => {
    const { pages: subPages, subPackage, ...arg } = _config
    if (subPages && subPackage) {
      const keys = Object.keys(subPages).filter(item => pageFilter({ ...arg, ...subPages[item], page: \`\${key}/\${item}\` }))
      if (keys.length) {
        _taroConfig.subPackages.push({
          root: key,
          pages: keys
        })
      }
      // 分包
      return []
    } else if (subPages) {
      // 未分包的分组
      return Object.keys(subPages)
        .filter(item => pageFilter({ ...arg, ...subPages[item], page: \`\${key}/\${item}\` }))
        .map(item => {
          const page = \`\${key}/\${item}\`
          if (subPages[item].home) {
            _homePages.push(page)
          }
          return page
        })
    } else {
      // 普通页面
      return [key].filter(() => pageFilter({ ...arg, page: key })).map(page => {
        if (_config.home) {
          _homePages.push(page)
        }
        return page
      })
    }
  })
  .flat()
  // 去重 排序
  .reduce((prev, current, index, arr) => {
    if (_homePages.includes(current)) {
      prev[0].push(current)
    } else {
      prev[1].push(current)
    }
    if (index === arr.length - 1) {
      return [...new Set(prev.flat())]
    } else {
      return prev
    }
  }, [[], []])
)

export default _taroConfig
`
    editFile(join('src', 'app.config.js'), () => template)
  }

  const createAppScss = apps => {
    let template = ''
    apps.forEach(app => {
      const scssPath = `src/${app}/app.scss`
      if (existsSync(pathJoin(scssPath))) {
        template += `/* ${app} */
${readFile(scssPath)}
`
      }
    })
    editFile(join('src', 'app.scss'), () => template)
  }

  // 创建h5端index.html入口文件
  const createIndexEntry = () => {
    const app = util.getEntryApp()
    const filePath = getPath('src', app, 'index.html')
    let template
    if (existsSync(filePath)) {
      template = file.readFile(filePath)
    } else {
      template = `<!DOCTYPE html>
<html>
<head>
  <meta content="text/html; charset=utf-8" http-equiv="Content-Type">
  <meta content="width=device-width,initial-scale=1,user-scalable=no" name="viewport">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-touch-fullscreen" content="yes">
  <meta name="format-detection" content="telephone=no,address=no">
  <meta name="apple-mobile-web-app-status-bar-style" content="white">
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
  <title></title>
  <script><%= htmlWebpackPlugin.options.script %></script>
</head>
<body>
  <div id="app"></div>
</body>
<style>
  taro-image-core {
    width: auto;
    height: auto;
  }
</style>
</html>
`
    }

    editFile(join('src', 'index.html'), () => template)
  }

  // 为duxapp模块创建配置入口文件
  const createDuxappUserConfig = configName => {
    const template = `import userConfig from '../../../configs/${configName}'

export {
  userConfig
}
`
    editFile(join('src', 'duxapp', 'config', 'userConfig.js'), () => template)
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

  /**
   * 创建依赖
   * @param {*} apps
   */
  const createNpmPackage = apps => {
    const marge = (target, source) => {
      if (typeof target !== 'object' || typeof source !== 'object' || target === null || source === null) {
        return source
      }

      for (const key in source) {
        const sourceItem = source[key]
        const targetItem = target[key]
        if (source.hasOwnProperty(key)) {
          if (Array.isArray(sourceItem) && Array.isArray(targetItem)) {
            // 如果是数组类型，将两个数组合并并去重
            sourceItem.forEach(item => {
              if (item && typeof item === 'object') {
                // 转为字符串判断合并
                const itemString = JSON.stringify(item)
                if (!targetItem.some(v => {
                  if (v && typeof v === 'object') {
                    return JSON.stringify(v) === itemString
                  }
                })) {
                  targetItem.push(item)
                }
              } else if (!targetItem.includes(item)) {
                targetItem.push(item)
              }
            })

          } else if (typeof sourceItem === 'object' && typeof targetItem === 'object') {
            // 如果是对象类型，递归合并
            target[key] = marge(targetItem, sourceItem)
          } else {
            // 其他类型直接覆盖
            target[key] = sourceItem
          }
        }
      }
      return target
    }
    editFile('package.json', () => {
      const content = {
        name: 'duxapp',
        version: '1.0.0',
        private: true,
        description: '基于Taro开发的多端统一开发框架',
        browserslist: [
          'defaults and fully supports es6-module',
          'maintained node versions'
        ],
        author: {
          name: 'duxapp',
          email: '908634674@qq.com',
          url: 'http://www.duxapp.cn'
        }
      }
      apps.map(app => {
        const appConfig = JSON.parse(readfile('src/' + app + '/app.json'))
        const packageData = readfile('src/' + app + '/package.json')
        if (appConfig.npm) {
          console.log('app.json 中的npm配置已经移动到模块的 package.json 文件内，npm配置将在不久的将来被删除')
        }
        marge(content, appConfig.npm)
        packageData && marge(content, JSON.parse(packageData))
      })
      return JSON.stringify(content, null, 2) + '\n'
    })
  }

  // 复制公共文件
  const copyFiles = apps => {
    // 删除兼容文件夹，防止重复
    file.delete('patches')
    apps.forEach(app => {
      const copyDir = `src/${app}/update/copy`
      if (existsSync(copyDir)) {
        file.copy(copyDir, '.')
      }
    })
  }

  // bable配置
  const createBableEntry = apps => {
    const template = `const configs = [
  ${apps.map(app => {
      const patchesDir = `./src/${app}/babel.config.js`
      if (existsSync(patchesDir)) {
        return `require('${patchesDir}')`
      }
    }).filter(v => v).join(',\n  ')}
]

module.exports = configs
`
    editFile(join('babel.user.config.js'), () => template)
  }
  // metro配置
  const createMetroEntry = apps => {
    const template = `const configs = [
    ${apps.map(app => {
      const patchesDir = `./src/${app}/metro.config.js`
      if (existsSync(patchesDir)) {
        return `require('${patchesDir}')`
      }
    }).filter(v => v).join(',\n  ')}
]

module.exports = configs
`
    editFile(join('metro.user.config.js'), () => template)
  }

  // 小程序配置文件
  const margeMiniConfig = configName => {
    const userProjectPath = file.pathJoin('configs', configName, 'project.config.json')
    if (existsSync(userProjectPath)) {
      file.editFile('project.config.json', val => {
        const data = JSON.parse(val)
        util.objectMarge(
          data,
          JSON.parse(file.readFile(userProjectPath)),
        )
        return JSON.stringify(data, null, 2) + '\n'
      })
    }
  }

  const _entryFile = async () => {

    project.update()

    const apps = util.getApps()
    const configName = util.getConfigName()

    // 入口
    createAppEntry(apps, configName)
    // 全局配置文件
    createConfigEntry(apps, configName)
    // 全局样式
    createAppScss(apps)
    // index.html入口
    createIndexEntry()
    // 用户配置
    createDuxappUserConfig(configName)
    // 主题转换
    createCommonScss(apps, configName)
    // 合并package.json
    createNpmPackage(apps)
    // 复制公共文件
    copyFiles(apps)
    // 合并babel配置
    createBableEntry(apps)
    // 合并metro配置
    createMetroEntry(apps)
    // 合并小程序配置文件
    margeMiniConfig(configName)
    // 安装依赖
    await util.asyncSpawn('yarn')
  }
  _entryFile.createAppEntry = createAppEntry
  _entryFile.createConfigEntry = createConfigEntry
  _entryFile.createIndexEntry = createIndexEntry
  _entryFile.createAppScss = createAppScss
  _entryFile.createCommonScss = createCommonScss
  _entryFile.createNpmPackage = createNpmPackage
  _entryFile.createBableEntry = createBableEntry
  _entryFile.createMetroEntry = createMetroEntry
  _entryFile.setProjectName = name => projectName = name
  return _entryFile
})();

/**
 * 通过配置和隐射编辑配置文件的相关配置
 */
const editConfig = (() => {

  const replaceRange = (str, start, end, replacement) => {
    if (start < 0 || start >= str.length || end < start || end > str.length) {
      throw new Error('Invalid range');
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
      const configName = util.getConfigName(util.getArgv().find(item => item.startsWith('--app=')))
      fileDir = getPath('configs', configName, 'index.js')
    } else {
      fileDir = getPath('configs', input)
    }
    const data = readFileSync(fileDir, { encoding: 'utf8' })
    writeFileSync(output ? getPath('configs', output, 'index.js') : fileDir, edit(data, config, mapping), { encoding: 'utf8' })
  }
})();

/**
 * 运行时相关命令(通常这是不需要手动操作的)
 * @app
 */
module.exports = {
  /**
   * 创建运行时所需文件
   */
  enterFile,
  editConfig
}
