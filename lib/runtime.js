const { readdirSync, lstatSync, readFileSync, writeFileSync, existsSync } = require('fs')
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
    const data = readFileSync(getPath('configs', configName, 'index.js'), { encoding: 'utf8' })
    const ast = parse(data, { sourceType: 'module' })

    let config = {}
    const configInit = ast.program.body.find(item => item.type === 'VariableDeclaration' && item.kind === 'const' && item.declarations[0]?.id?.name === 'config')?.declarations[0]?.init
    if (configInit) {
      config = astToObject(configInit)
    }
    return config
  }

  const getRoute = apps => {
    return `${apps.map(app => `import ${app}Route from './${app}/config/route'`).join('\r')}

const route = {
  ${apps.map(app => `${app}: ${app}Route`).join(',\r  ')}
}`
  }

  // 创建app入口文件
  const createAppEntry = (apps, configName) => {
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
import { useDidHide, useDidShow } from '@tarojs/taro'
import { useEffect } from 'react'

import { registerPages, setAppTheme, useLaunch } from './duxapp/utils'

${apps.map(app => `import ${app} from './${app}/app'`).join('\r')}

${themeApps.map(app => `import ${app}Theme from './${app}/config/theme'`).join('\r')}

import config from '../configs/${configName}'

import './app.scss'

${getRoute(apps)}

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

const App = props => {

  useEffect(effect, [])

  useLaunch(launch)

  useDidShow(show)

  useDidHide(hide)

  return <>
    {props.children}
  </>
}

export default App
`
    editFile(join('src', 'app.js'), () => template)
  }

  // 创建入口配置文件
  const createConfigEntry = (apps, configName) => {
    const config = getAppUserConfig(configName)
    delete config.option
    const template = `${getRoute(apps)}

const _duxapp = ${JSON.stringify(config, null, 2)}

// eslint-disable-next-line no-undef
const _taroConfig = {
  window: {
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTextStyle: 'black',
    // 自定义头部
    navigationStyle: 'custom',
    // 禁用页面滚动
    disableScroll: true,
  },
  // 开启动画
  animation: {
    duration: 300
  },
  // h5要在哪个节点渲染
  appId: 'app',
  pages: [],
  subPackages: [],
  ..._duxapp.configs,
  rn: {
    useNativeStack: true,
    ..._duxapp.configs?.rn
  }
}

const pageFilter = item => {
  // 判断平台
  if (item.platform && !item.platform?.includes(process.env.TARO_ENV)) {
    return false
  }
  // 判断是否禁用
  if (_duxapp.disablePages?.some(page => item.page.includes(page))) {
    return false
  }
  // 判断默认是否启用
  if (item.disable && !_duxapp.openPages?.includes(item.page)) {
    return false
  }
  return true
}

_taroConfig.subPackages = []
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
          root: \`\${key}/\`,
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

  const createAppScss = () => {
    const template = `/*  #ifndef rn h5  */
page {
  height: 100vh;
}

/*  #endif  */

/*  #ifdef h5  */
.taro_page {
  height: 100vh;
}

/*  #endif  */

/*  #ifdef h5  */
taro-input-core {
  position: relative;

  input {
    position: absolute;
    transform: translateY(-50%);
    top: 50%;
  }
}

/*  #endif  */

/*  #ifdef weapp  */
.button-clean {
  position: relative;
  display: flex;
  flex-direction: column;
  margin-left: initial;
  margin-right: initial;
  padding-left: initial;
  padding-right: initial;
  line-height: initial;
  font-size: initial;
  background-color: initial;
  border: initial;
  padding: 0;
  box-sizing: border-box;
  text-decoration: none;
  border-radius: 0;
  -webkit-tap-highlight-color: transparent;

  &::after {
    border: none;
  }
}

/*  #endif  */

.bg-img {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

/* overflow */
.overflow-hidden {
  overflow: hidden;
}

/* 定位 */
.absolute {
  position: absolute;
}

.inset-0 {
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
}

.top-0 {
  top: 0;
}

.right-0 {
  right: 0;
}

.bottom-0 {
  bottom: 0;
}

.left-0 {
  left: 0;
}

/* z-index */

.z-0 {
  z-index: 0;
}

.z-1 {
  z-index: 1;
}

/* flex */
.flex-row {
  flex-direction: row;
}

.flex-row-reverse {
  flex-direction: row-reverse;
}

.flex-col-reverse {
  flex-direction: column-reverse;
}

.flex-wrap {
  flex-wrap: wrap;
}

.flex-wrap-reverse {
  flex-wrap: wrap-reverse;
}

.flex-grow {
  flex: 1;
}

.flex-shrink {
  flex-shrink: 0;
}

.justify-end {
  justify-content: flex-end;
}

.justify-center {
  justify-content: center;
}

.justify-between {
  justify-content: space-between;
}

.justify-around {
  justify-content: space-around;
}

.justify-evenly {
  justify-content: space-evenly;
}

.content-center {
  align-content: center;
}

.content-start {
  align-content: flex-start;
}

.content-end {
  align-content: flex-end;
}

.content-between {
  align-content: space-between;
}

.content-around {
  align-content: space-around;
}

.items-start {
  align-items: flex-start;
}

.items-end {
  align-items: flex-end;
}

.items-center {
  align-items: center;
}

.items-baseline {
  align-items: baseline;
}

.self-start {
  align-self: flex-start;
}

.self-end {
  align-self: flex-end;
}

.self-center {
  align-self: center;
}

.self-stretch {
  align-self: stretch;
}

.self-baseline {
  align-self: baseline;
}

/* size */
.w-full {
  width: 100%;
}

.h-full {
  height: 100%;
}

.w-0 {
  width: 0;
}

.h-0 {
  height: 0;
}

/* 文本 */
.text-24 {
  font-size: 24px;
}

.text-26 {
  font-size: 26px;
}

.text-28 {
  font-size: 28px;
}

.text-30 {
  font-size: 30px;
}

.text-32 {
  font-size: 32px;
}

.text-36 {
  font-size: 32px;
}

.text-48 {
  font-size: 48px;
}

/* 斜体 */
.italic {
  font-style: italic;
}

/* 加粗 */
.bold {
  font-weight: bold;
}

/* 文本对齐 */
.text-left {
  text-align: left;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.text-justify {
  text-align: justify;
}

/* 文本颜色 */
.text-transparent {
  color: transparent;
}

.text-black {
  color: #000;
}

.text-white {
  color: #fff;
}

/* 文本装饰 */
.underline {
  text-decoration: underline;
}

.line-through {
  text-decoration: line-through;
}

/* 文本转换 */
.uppercase {
  text-transform: uppercase;
}

.lowercase {
  text-transform: lowercase;
}

.capitalize {
  text-transform: capitalize;
}

/* 边框颜色 */
.border-black {
  border-color: #000;
}

.border-white {
  border-color: #fff;
}

/* 边框样式 */
.border-dotted {
  border-style: dotted;
}

.border-dashed {
  border-style: dashed;
}

// 内边距
.p-1 {
  padding: 8px;
}

.p-2 {
  padding: 16px;
}

.p-3 {
  padding: 24px;
}

.pv-1 {
  padding-top: 8px;
  padding-bottom: 8px;
}

.pv-2 {
  padding-top: 16px;
  padding-bottom: 16px;
}

.pv-3 {
  padding-top: 24px;
  padding-bottom: 24px;
}

.ph-1 {
  padding-left: 8px;
  padding-right: 8px;
}

.ph-2 {
  padding-left: 16px;
  padding-right: 16px;
}

.ph-3 {
  padding-left: 24px;
  padding-right: 24px;
}

// 圆角
.r-1 {
  border-radius: 8px;
}

.r-2 {
  border-radius: 16px;
}
`
    editFile(join('src', 'app.scss'), () => template)
  }

  // 创建h5端index.html入口文件
  const createIndexEntry = () => {
    const template = `<!DOCTYPE html>
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

  return () => {
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
    const configName = util.getConfigName(customAppsArgv)

    createAppEntry(apps, configName)
    createConfigEntry(apps, configName)
    createAppScss()
    createIndexEntry(apps, configName)
    createDuxappUserConfig(configName)

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
      const configName = util.getConfigName(util.getArgv().find(item => item.startsWith('--app=')))
      fileDir = getPath('configs', configName, 'index.js')
    } else {
      fileDir = getPath('configs', input)
    }
    const data = readFileSync(fileDir, { encoding: 'utf8' })
    writeFileSync(output ? getPath('configs', output, 'index.js') : fileDir, edit(data, config, mapping), { encoding: 'utf8' })
  }
})();

module.exports = {
  enterFile,
  editConfig
}
