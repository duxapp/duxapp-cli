import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { isObjectExpression, isIdentifier } from '@babel/types'
import { parse } from '@babel/parser'

import * as util from './util.js'
import * as file from './file.js'
import * as project from './project.js'

/**
 * 运行时相关命令(通常这是不需要手动操作的)
 * @app
 */
const app = 'runtime'

let projectName = ''

const getPath = (...dirs) => join(process.cwd(), projectName, ...dirs)

/**
 * 创建运行时所需文件
 * @function
 */
export const enterFile = (() => {

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
  const getAppUserConfig = (configName) => {
    const filePath = getPath('configs', configName, 'index.js')
    const data = readFileSync(filePath, { encoding: 'utf8' })
    const ast = parse(data, { sourceType: 'unambiguous', plugins: ['jsx'] })

    let config = {}

    const configMap = new Map()

    for (const node of ast.program.body) {
      // const config = { ... }
      if (
        node.type === 'VariableDeclaration' &&
        node.kind === 'const'
      ) {
        for (const decl of node.declarations) {
          if (
            decl.id?.type === 'Identifier' &&
            isObjectExpression(decl.init)
          ) {
            configMap.set(decl.id.name, decl.init)
          }
        }
      }

      // export default ...
      if (node.type === 'ExportDefaultDeclaration') {
        const decl = node.declaration
        if (isObjectExpression(decl)) {
          return astToObject(decl)
        }
        if (isIdentifier(decl) && configMap.has(decl.name)) {
          return astToObject(configMap.get(decl.name))
        }
      }

      // module.exports = ...
      if (
        node.type === 'ExpressionStatement' &&
        node.expression.type === 'AssignmentExpression'
      ) {
        const { left, right } = node.expression
        if (
          left.type === 'MemberExpression' &&
          left.object.name === 'module' &&
          left.property.name === 'exports'
        ) {
          if (isObjectExpression(right)) {
            return astToObject(right)
          }
          if (isIdentifier(right) && configMap.has(right.name)) {
            return astToObject(configMap.get(right.name))
          }
        }
      }
    }

    return config
  }

  // 获取模块路由 和 模块配置
  const getRouteAndConfig = (apps, getConfig) => {
    const isRoute = app => existsSync(file.pathJoin('src', app, 'config', 'route.js'))
    const isConfig = app => existsSync(file.pathJoin('src', app, 'app.config.js'))
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

  const createTaroConfig = async apps => {
    const files = {
      import: [],
      index: [],
      dev: [],
      prod: []
    }
    const capitalize = str => str && str[0].toUpperCase() + str.slice(1)
    for (let i = 0; i < apps.length; i++) {
      const app = apps[i]
      const addType = type => {
        const fileName = `taro.config${type === 'index' ? '' : `.${type}`}`
        const filePath = `./src/${app}/${fileName}.js`
        const name = `${app}${capitalize(type)}`
        if (existsSync(filePath)) {
          files.import.push(`import ${name} from './${name}'`)
          files[type].push(name)
          file.copy(filePath, `config/userConfig/${name}.js`)
        }
      }
      addType('index')
      addType('dev')
      addType('prod')
    }

    editFile(join('config', 'userConfig', 'index.js'), () => `${files.import.join('\n')}

export default {
  index: [${files.index.join(', ')}],
  dev: [${files.dev.join(', ')}],
  prod: [${files.prod.join(', ')}]
}
`)
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

const merge = (target, source) => {
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
        target[key] = merge(targetItem, sourceItem)
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
  pages: [],
  subPackages: [],
  window: {
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTextStyle: 'black',
    // 自定义头部
    navigationStyle: 'custom'
  }
}

if (process.env.TARO_ENV === 'rn') {
  _taroConfig.rn = {
    useNativeStack: true
  }
} else if (process.env.TARO_ENV === 'h5') {
  // H5端现在在哪个节点
  _taroConfig.appId = 'app'
  // H路由动画
  _taroConfig.animation = {
    duration: 300
  }
} else if (process.env.TARO_PLATFORM === 'mini') {
  if (process.env.TARO_ENV !== 'weapp') {
    // 支付宝、抖音导航栏透明
    _taroConfig.window.transparentTitle = 'always'
  }
}

// 合并模块配置
Object.keys(configs).forEach(key => {
  merge(_taroConfig, configs[key])
})

// 合并用户配置
merge(_taroConfig, _duxapp.appConfig)

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
      if (existsSync(file.pathJoin(scssPath))) {
        template += `/* ${app} */
${file.readFile(scssPath)}
`
      }
    })
    editFile(join('src', 'app.scss'), () => template)
  }

  // 创建h5端index.html入口文件
  const createIndexEntry = async () => {
    const app = await util.getEntryApp()
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

  const createCommonScss = async (apps, configName) => {
    apps = [...apps]
    const { option } = getAppUserConfig(configName)
    let scss = ''
    // 将duxapp排在第一个
    const duxappIndex = apps.indexOf('duxapp')
    if (duxappIndex > 0) {
      apps.unshift(apps.splice(duxappIndex, 1)[0])
    }
    await Promise.all(apps.map(async app => {
      const filePath = getPath('src', app, 'config', 'themeToScss.js')
      if (existsSync(filePath)) {
        const exec = await util.importjs(filePath)
        scss += (exec(option?.[app]?.theme || {}) + '\n\n')
      }
    }))
    editFile(join('src', 'theme.scss'), () => scss)
  }

  const createNpmPackage = apps => {
    const merge = (target, source) => {
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
            target[key] = merge(targetItem, sourceItem)
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
          url: 'http://www.duxapp.com'
        }
      }
      apps.map(app => {
        const appConfig = JSON.parse(readfile('src/' + app + '/app.json'))
        const packageData = readfile('src/' + app + '/package.json')
        if (appConfig.npm) {
          console.log('app.json 中的npm配置已经移动到模块的 package.json 文件内，npm配置将在不久的将来被删除')
        }
        merge(content, appConfig.npm)
        packageData && merge(content, JSON.parse(packageData))
      })
      return JSON.stringify(content, null, 2) + '\n'
    })
  }

  // 复制公共文件
  const copyFiles = apps => {
    // 删除兼容文件夹，防止重复
    file.remove('patches')
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
  const mergeMiniConfig = configName => {
    const config = {
      miniprogramRoot: 'dist/weapp/',
      projectname: 'duxapp',
      description: 'duxapp',
      appid: 'touristappid',
      setting: {
        urlCheck: false,
        es6: false,
        enhance: false,
        compileHotReLoad: false,
        postcss: false,
        minified: false,
        bigPackageSizeSupport: true
      },
      compileType: 'miniprogram'
    }
    const userProjectPath = file.pathJoin('configs', configName, 'project.config.json')
    if (existsSync(userProjectPath)) {
      util.objectMerge(
        config,
        JSON.parse(file.readFile(userProjectPath)),
      )
    }
    file.writeFile('project.config.json', JSON.stringify(config, null, 2) + '\n')
  }

  const _entryFile = async () => {

    project.update(false)

    const entryApp = await util.getEntryApp(true)
    const apps = await util.getApps()
    const configName = await util.getConfigName()

    // Taro编译配置文件
    await createTaroConfig(apps)
    // 入口
    createAppEntry(apps, configName)
    // 全局配置文件
    createConfigEntry(apps, configName)
    // 全局样式
    createAppScss(apps)
    // index.html入口
    await createIndexEntry()
    // 用户配置
    createDuxappUserConfig(configName)
    // 主题转换
    await createCommonScss(apps, configName)
    // 合并package.json
    createNpmPackage(apps)
    // 复制公共文件
    copyFiles(apps)
    // 合并babel配置
    createBableEntry(apps)
    // 合并metro配置
    createMetroEntry(apps)
    // 合并小程序配置文件
    mergeMiniConfig(configName)
    // 创建临时缓存
    util.mergeBuildConfig({
      entryApp,
      apps,
      configName
    })
    // 安装依赖
    await util.asyncSpawn('yarn')
    // 执行patch
    await util.asyncSpawn('patch-package')
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
