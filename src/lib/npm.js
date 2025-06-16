import { getEntryApp } from './util.js'
import { request } from './net.js'
import { editJson } from './file.js'

/**
 * 用于模块插件添加等操作
 * @app
 */
const app = 'npm'

/**
 * 将依赖添加到模块内，支持通过 @ 指定版本号
 * @function
 * @param packages 要添加的依赖
 */
export const add = async (...packages) => {
  if (!packages.length) {
    throw new Error('请通过参数传入要安装的插件')
  }
  const app = await getEntryApp()
  const parseName = name => {
    const splits = name.split('@')
    if (!splits[0]) {
      splits[1] = '@' + splits[1]
      return splits.slice(1)
    }
    return splits
  }
  const infos = await Promise.all(packages.map(async name => {
    return await request(`https://registry.npmjs.org/${parseName(name)[0]}`)
  }))
  const errors = infos.filter(v => v.error)
  if (errors.length) {
    throw new Error(`插件信息获取失败: 
${errors.map((error, i) => `${packages[i]}: ${error.error}`).join('\n')}`)
  }
  const dependencies = {}
  for (let i = 0; i < packages.length; i++) {
    const info = infos[i]
    const versions = Object.keys(info.versions)
    const [name, version = info['dist-tags']?.latest || versions[versions.length - 1]] = parseName(packages[i])
    if (!versions.includes(version)) {
      throw new Error(`${name}@${version} 版本不存在，检查后重试`)
    }
    dependencies[name] = '~' + version
  }
  editJson(`src/${app}/package.json`, json => {
    json.dependencies = {
      ...json.dependencies,
      ...dependencies
    }
    return json
  })
  console.log(`${app} 模块插件 ${Object.keys(dependencies).map(key => `${key}@${dependencies[key]}`).join(' ')} 安装成功`)
}