
const file = require('./file')
const { request } = require('./net')
const fs = require('fs')
const { pathJoin } = require('./file')
const qiniu = require('./qiniu')
const net = require('./net')

module.exports = {
  /**
   * 创建一个图标组件
   * @param {*} name 字体名称
   * @param {*} name 创建在哪个模块下
   * @param {*} url iconFont图标库的css地址
   */
  async create(name, app, url) {
    if (!/^[A-Z][A-Za-z0-9]{1,}Icon$/.test(name)) {
      return console.error('名称不合法 仅支持大小写字母和数字 首字母大写 并且以Icon结尾')
    }
    if (!fs.existsSync(pathJoin('src', app))) {
      return console.error('app不存在')
    }
    // if (fs.existsSync(pathJoin('src', app, 'components', name))) {
    //   return console.error('此图标组件已经存在')
    // }
    if (!/^https:\/\/at.alicdn.com\/[\/A-Za-z0-9_-]{1,}\.css$/.test(url)) {
      return console.error('图标库css链接错误 仅支持iconfont的图表库的css链接')
    }
    const content = await request(url)
    let fontUrl = 'https:' + content.match(/url\('(\/\/at.alicdn.com\/[\/a-zA-Z0-9_]{1,}\.ttf\?t=\d{1,})'\)/)[1]

    // 下载图标
    const filename = `dist/${name}.ttf`
    await net.download(fontUrl, filename)

    // 上传到CDN
    fontUrl = await qiniu.upload(filename, `fonts/${name}.${new Date().getTime()}.ttf`).catch(err => {
      console.log('图标库上传CDN失败', err)
      return fontUrl
    })

    file.delete(filename)

    const reg = new RegExp('\\.([a-zA-Z0-9-_]{1,}):before[\\s\\S]*?"\\\\([a-f0-9]{4})"[\\s\\S]*?;', 'g')
    let rs_match = reg.exec(content)
    let obj = []
    while (!!rs_match) {
      obj.push([rs_match[1], parseInt(rs_match[2], 16)])
      rs_match = reg.exec(content)
    }
    // 判断是否有相同前缀，有的话移除这些前缀‘
    if (obj[0]) {
      const [prefix] = obj[0][0].split('-')
      if (obj.some(([key]) => key.startsWith(prefix + '-'))) {
        const len = prefix.length + 1
        obj = obj.map(([key, value]) => {
          return [key.substring(len), value]
        })
      }
    }
    // console.log(JSON.stringify(Object.fromEntries(obj), null, 2))
    // console.log(obj.map(v => `'${v[0]}'`).join('\n'))

    createIconComp(name, app, fontUrl, obj)
  }
}

const createIconComp = (name, app, url, icons) => {
  const json = JSON.stringify(Object.fromEntries(icons), null, 2)
  const jsx = `import { Text } from '@tarojs/components'
import { useMemo } from 'react'
import { font, px } from '@/duxapp/utils'
import icons from './icons.json'
import './index.scss'

font.load('${name}', '${url}')

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

  const status = font.useFont('${name}')

  if (!icons[name]) {
    return console.log(\`${name}的\${name}图标不存在\`)
  }

  if (!status) {
    return null
  }

  return <Text
    className={\`${name}\${className ? ' ' + className : ''}\`}
    style={_style}
    {...props}
  >
    {String.fromCharCode(icons[name])}
  </Text>
}
`
  const ts = `import { ComponentType, Component, CSSProperties } from 'react'

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
export class ${name} extends Component<${name}Props> {

}
`
  const scss = `.${name} {
  font-family: ${name};
}
`
  const compPath = `src/${app}/components/${name}`
  if (!fs.existsSync(pathJoin(compPath))) {
    fs.mkdirSync(pathJoin(compPath))
  }
  file.editFile(compPath + '/icons.json', () => json)
  file.editFile(compPath + '/index.d.ts', () => ts)
  file.editFile(compPath + '/index.jsx', () => jsx)
  file.editFile(compPath + '/index.scss', () => scss)
}
