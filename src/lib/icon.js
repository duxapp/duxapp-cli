
import fs from 'fs'

import * as file from './file.js'
import * as net from './net.js'

/**
 * 创建字体图标命令
 * @app
 */
const app = 'icon'
/**
 * 创建一个图标组件，创建后会放在模块的 components 目录下，请自行导出
 * @function
 * @param name 组件名称，要求以Icon结尾，例如：MyIcon
 * @param name 创建在哪个模块里面
 * @param url iconFont图标库的css地址，只要参数前面的部分
 * @param online [可选]是否创建在线图标
 */
export const create = async (name, app, url, online) => {
  if (!/^[A-Z][A-Za-z0-9]{1,}Icon$/.test(name)) {
    return console.error('名称不合法 仅支持大小写字母和数字 首字母大写 并且以Icon结尾')
  }
  if (!fs.existsSync(file.pathJoin('src', app))) {
    return console.error(`${app}模块不存在`)
  }
  if (!/^https:\/\/at.alicdn.com\/[\/A-Za-z0-9_-]{1,}\.css/.test(url)) {
    return console.error('图标库css链接错误 仅支持iconfont的图标库的css链接')
  }
  const content = await net.request(url)
  const fontFamily = content.match(/font-family: "([a-zA-Z0-9-_]{1,})"/)[1]
  if (fontFamily === 'iconfont') {
    console.log('当前设置的 Font Family 为默认的 iconfont，使用默认字体会导致 RN IOS端无法使用， 请通过项目设置修改 Font Family 参数（每个图标库使用不同的名称）')
  }
  let fontUrl = 'https:' + content.match(/url\('(\/\/at.alicdn.com\/[\/a-zA-Z0-9_]{1,}\.ttf\?t=\d{1,})'\)/)[1]

  if (!fontUrl) {
    return console.error('需要在项目设置中 字体格式勾选 TTF 格式')
  }

  // 下载图标
  const filename = `dist/${name}.ttf`
  await net.download(fontUrl, filename)

  const compPath = `src/${app}/components/${name}`
  if (!fs.existsSync(file.pathJoin(compPath))) {
    fs.mkdirSync(file.pathJoin(compPath))
  }

  let woff2 = ''
  if (!online) {
    let start = `url('data:application/x-font-woff2;charset=utf-8;base64,`
    const index = content.indexOf(start)
    if (!~index) {
      console.log('创建失败：生成本地图标，需要在字体设置里面，字体格式中勾选“Base64”')
      process.exit(1)
    }
    const end = content.indexOf(')', index)
    woff2 = content.slice(index + start.length, end - 1)
    // 复制文件
    file.copy(filename, `${compPath}/${name}.ttf`)
  }

  file.remove(filename)

  const reg = new RegExp('\\.([a-zA-Z0-9-_]{1,}):before[\\s\\S]*?"\\\\([a-f0-9]{4,})"[\\s\\S]*?;', 'g')
  let rs_match = reg.exec(content)
  let obj = []
  while (!!rs_match) {
    obj.push([rs_match[1], parseInt(rs_match[2], 16)])
    rs_match = reg.exec(content)
  }
  // 判断是否有相同前缀，有的话移除这些前缀
  if (obj[0]) {
    const [prefix] = obj[0][0].split('-')
    if (obj.some(([key]) => key.startsWith(prefix + '-'))) {
      const len = prefix.length + 1
      obj = obj.map(([key, value]) => {
        return [key.substring(len), value]
      })
    }
  }

  createIconComp(name, fontUrl, obj, online, compPath, woff2)

  console.log(`${online ? '在线' : '本地'}图标组件创建成功，位于：src/${app}/components/${name}`)
}


const createIconComp = (name, url, icons, online, compPath, content) => {
  const json = JSON.stringify(Object.fromEntries(icons), null, 2)
  const jsx = `import { Text } from '@tarojs/components'
import { useMemo } from 'react'
import { font, px } from '@/duxapp/utils'
import icons from './icons.json'
import './index.scss'

${!online ? `if (process.env.TARO_ENV === 'rn' || process.env.TARO_ENV === 'harmony_cpp') {
  font.loadLocal('${name}', require('./${name}.ttf'))
}` : `font.load('${name}', '${url}')`}

export const ${name} = ({ name, color, size, style, className, ...props }) => {

  const _style = useMemo(() => {
    const sty = { ...style }
    if (color) {
      sty.color = color
    }
    if (size) {
      sty.fontSize = px(size)
    }
    return sty
  }, [color, size, style])
${!online ? '' : `
  const status = font.useFont('${name}')
`}
  if (!icons[name]) {
    return console.log(\`${name}的\${name}图标不存在\`)
  }
${!online ? '' : `
  if (!status) {
    return null
  }
`}
  return <Text
    className={\`${name}\${className ? ' ' + className : ''}\`}
    style={_style}
    {...props}
  >
    {String.fromCharCode(icons[name])}
  </Text>
}
`
  const ts = `import { ComponentType, CSSProperties } from 'react'

interface names {
  ${icons.map(([key]) => `'${key}'`).join('\n  ')}
}

interface ${name}Props {
  /** 图标名称 */
  name?: keyof names
  /**
   * 图标颜色
   */
  color?: string
  /**
   * 图标尺寸
   */
  size?: number,
  /**
   * class
   */
  className: string,
  /**
   * 样式
   */
  style: CSSProperties,
  /**
   * 点击事件
   * @returns
   */
  onClick: () => void
}

/**
 * ${name} 图标库
 */
export const ${name}: ComponentType<${name}Props>
`
  const rnScss = `.${name} {
  font-family: ${name};
}
`
  const scss = `${rnScss}${!online ? `
/*  #ifndef harmony  */
@font-face {
  font-family: "${name}";
  src: url('data:application/x-font-woff2;charset=utf-8;base64,${content}') format('woff2');
}
/*  #endif  */
`: ''}`
  file.editFile(compPath + '/icons.json', () => json)
  file.editFile(compPath + '/index.d.ts', () => ts)
  file.editFile(compPath + '/index.jsx', () => jsx)
  file.editFile(compPath + '/index.scss', () => scss)
  file.editFile(compPath + '/index.rn.scss', () => rnScss)
}
