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
      file.mkdirSync(filePath, true)
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
  const getRouteAndConfig = (apps, configName, getConfig) => {
    const isRoute = app => existsSync(file.pathJoin('src', app, 'config', 'route.js'))
    const isConfig = app => existsSync(file.pathJoin('src', app, 'app.config.js'))
    const isUserConfig = existsSync(file.pathJoin('configs', configName, 'app.config.js'))
    return `${apps.map(app => {
      if (isRoute(app)) {
        return `import ${app}Route from './${app}/config/route'`
      }
    }).filter(v => v).join('\n') + '\n'}${getConfig ? apps.map(app => {
      if (isConfig(app)) {
        return `import ${app}Config from './${app}/app.config'`
      }
    }).filter(v => v).join('\n') + '\n' : ''}${isUserConfig
      ? `import userConfig_ from '../configs/${configName}/app.config'
`
      : ''
      }
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
}
const userConfig__ = ${isUserConfig ? 'userConfig_' : '{}'}` : ''}`
  }

  const createTaroConfig = apps => {
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

import { theme } from './duxapp/utils/theme'
import { registerPages, useLaunch } from './duxapp/utils'

${entryApps.map(app => `import * as ${app} from './${app}/app'`).join('\n')}

${themeApps.map(app => `import ${app}Theme from './${app}/config/theme'`).join('\n')}

import config from '../configs/${configName}'

import './app.scss'

${getRouteAndConfig(apps, configName)}
${config.debug?.vconsole ? `
if (process.env.TARO_ENV === 'h5') {
  const VConsole = require('vconsole')
  const vConsole = new VConsole()
}
`: ''}
// 注册路由
registerPages(route, config)

const appThemes = { ${themeApps.map(app => `${app}: ${app}Theme`).join(', ')} }
theme.registerAppThemes(appThemes)

const apps = { ${entryApps.join(', ')} }
Object.keys(apps).forEach(app => {
  apps[app].default?.option?.(config.option?.[app] || {})
})

const exec = (name, ...arg) => {
  Object.values(apps).forEach(app => {
    app.default?.[name]?.(...arg)
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

  // 判断配置的主题是否支持暗黑模式切换
  const isDark = config => {
    const themeConfig = config.option?.duxapp?.themeConfig
    if (!themeConfig || !themeConfig.themes) {
      return false
    }
    themeConfig.dark ||= 'dark'
    themeConfig.light ||= 'light'
    return themeConfig.themes[themeConfig.dark] && themeConfig.themes[themeConfig.light]
  }

  // 创建入口配置文件
  const createConfigEntry = (apps, configName) => {
    const config = getAppUserConfig(configName)
    if (config.appConfig) {
      console.log(`提示：请将 ${join(process.cwd(), `configs/${configName}/index.js`)} 中的 appConfig 移动到同一目录下的 app.config.js 文件内`)
    }
    if (isDark(config)) {
      config.appConfig ||= {}
      config.appConfig.darkmode = true
    }
    delete config.option
    const template = `${getRouteAndConfig(apps, configName, true)}

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
    navigationStyle: 'custom',
    disableScroll: true
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
// 合并用户配置
merge(_taroConfig, userConfig__)

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
  const createIndexEntry = app => {
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

  /**
   * 将 SCSS 变量转换为 CSS 变量
   * @param {string} scssContent - 包含 SCSS 变量的文本
   * @returns {string} 转换后的 CSS 变量文本
   */
  const convertScssVarsToCss = scssContent => {
    const scssVarRegex = /^\s*\$([a-zA-Z0-9_-]+):\s*([^;]+)/gm
    const scssVars = {}
    const varNames = []

    let match
    while ((match = scssVarRegex.exec(scssContent)) !== null) {
      const varName = match[1]
      scssVars[varName] = match[2].trim()
      varNames.push(varName)  // 收集变量名
    }

    // 第二步：解析变量引用
    const resolveValue = (value) => {
      return value.replace(/#\{\$([^}]+)\}|\$([a-zA-Z0-9_-]+)/g, (_, ref1, ref2) => {
        const ref = ref1 || ref2
        return scssVars[ref] ? resolveValue(scssVars[ref]) : ''
      })
    }

    // 第三步：生成 CSS 变量
    const cssVars = []
    const cssObj = {}
    for (const [varName, varValue] of Object.entries(scssVars)) {
      const cssVarName = `--${varName.replace(/([A-Z])/g, '-$1').toLowerCase()}`
      const resolvedValue = resolveValue(varValue).trim()

      if (resolvedValue) {
        cssVars.push(`${cssVarName}: ${resolvedValue};`)
        cssObj[varName] = resolvedValue
      }
    }

    return {
      cssVars: cssVars.join('\n'),
      varNames: varNames,
      cssObj
    }
  }

  const createCommonScss = async (apps, configName) => {
    apps = [...apps]
    const { option = {} } = getAppUserConfig(configName)
    // 将duxapp排在第一个
    const duxappIndex = apps.indexOf('duxapp')
    if (duxappIndex > 0) {
      apps.unshift(apps.splice(duxappIndex, 1)[0])
    }
    const themeConfig = option.duxapp?.themeConfig || {}

    themeConfig.light ||= 'light'
    themeConfig.dark ||= 'dark'
    themeConfig.default ||= 'light'

    themeConfig.themes ||= {
      light: {}
    }

    if (!themeConfig.themes[themeConfig.default]) {
      throw new Error(`默认主题配置 ${themeConfig.default} 不存在 themes 列表中`)
    }

    let themeGlobal = ''
    const themeScss = {}
    const themeScssVar = {}
    for (const mode in themeConfig.themes) {
      themeScss[mode] ||= ''
      for (let i = 0; i < apps.length; i++) {
        const app = apps[i]
        const filePath = getPath('src', app, 'config', 'themeToScss.js')
        if (existsSync(filePath)) {
          const themes = {
            ...option[app]?.themes
          }
          if (option[app]?.theme && !themes.light) {
            themes.light = option[app].theme
          }
          const defaultTheme = themes[themeConfig.default]

          const theme = {}
          util.objectMerge(theme, defaultTheme)
          themes[mode] && util.objectMerge(theme, themes[mode])
          const exec = await util.importjs(filePath)
          const scss = exec(theme) + '\n\n'
          if (mode === themeConfig.default) {
            themeGlobal += scss
          }
          themeScss[mode] += scss
        }
      }
      const res = convertScssVarsToCss(themeScss[mode])
      themeScss[mode] = res.cssVars
      themeScssVar[mode] = res.cssObj

      if (mode === themeConfig.default) {
        util.mergeBuildConfig({
          themeVarNames: res.varNames,
          themeConfig
        })
      }
    }

    editFile(join('src', 'theme.scss'), () => themeGlobal)
    editFile(join('src', 'duxapp', 'userTheme', 'index.scss'), () => {

      return `/*  #ifndef rn harmony  */
${Object.keys(themeScss)
          .map(mode => {
            return `.duxapp-theme-${mode} {
${themeScss[mode]}
}`
          })
          .join('\n\n')
        }
/*  #endif  */
`
    })
    editFile(join('src', 'duxapp', 'userTheme', 'index.js'), () => `export default {}`)
    editFile(join('src', 'duxapp', 'userTheme', 'index.rn.js'), () => `import { pxTransform } from '@tarojs/runtime-rn'

export default ${JSON
        .stringify(themeScssVar, null, 2)
        .replace(/"([+-]?\d+(?:\.\d+)?)px"/g, 'pxTransform($1)')
      }`)
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
    const npmPackage = JSON.stringify(content, null, 2) + '\n'
    const duxappPackage = readfile('dist/duxapp-package.json')
    if (duxappPackage !== npmPackage) {
      editFile('package.json', () => npmPackage)
      return {
        change: true,
        done: () => {
          editFile('dist/duxapp-package.json', () => npmPackage)
        }
      }
    }
    return {
      change: false
    }
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

    // 复制metro配置文件
    const tempList = 'src/duxappReactNative/template'
    if (file.existsSync(tempList)) {
      const rnList = ['index.js', 'metro.config.js']
      rnList.forEach(name => {
        file.copy(join(tempList, name), name)
      })
    }
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
    createTaroConfig(apps)
    // 入口
    createAppEntry(apps, configName)
    // 全局配置文件
    createConfigEntry(apps, configName)
    // 全局样式
    createAppScss(apps)
    // index.html入口
    createIndexEntry(entryApp[0])
    // 用户配置
    createDuxappUserConfig(configName)
    // 主题转换
    await createCommonScss(apps, configName)
    // 合并package.json
    const npmPackage = createNpmPackage(apps)
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
    if (npmPackage.change) {
      // 安装依赖
      await util.asyncSpawn('yarn')
      // 写入编译缓存
      npmPackage.done()
    }
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
