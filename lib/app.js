/* eslint-disable import/no-commonjs */
const fs = require('fs')
const crypto = require('crypto')
const archiver = require('archiver')
const StreamZip = require('node-stream-zip')
const inquirer = require('inquirer')
const file = require('./file')
const { pathJoin } = require('./file')
const user = require('./user')
const net = require('./net')

module.exports = {

  /**
   * 添加app
   * @param  {...any} apps
   */
  async add(...apps) {
    if (!apps.length) {
      console.log('请输入要安装的模块')
    }
    try {
      const res = await user.request('package/version/query?type=duxapp&download=1', 'POST', Object.fromEntries(apps.map(app => [app, ''])))
      // 删除关联模块 重新下载
      await Promise.all(res.map(item => {
        return net.download(item.url, `dist/${item.app}.zip`)
      }))
      await Promise.all(res.map(({ app }) => {
        return new Promise((resolve) => {
          file.delete('src/' + app)
          const filename = `dist/${app}.zip`
          const zip = new StreamZip({
            file: file.pathJoin(filename),
            storeEntries: true
          })
          zip.on('ready', () => {
            zip.extract('', file.pathJoin('src', app), () => {
              file.delete(filename)
              zip.close()
              resolve()
            })
          })
        })
      }))
      console.log(`模块:${res.map(v => v.name).join(' ')} 已经安装/更新`)
    } catch (error) {
      console.log('获取模块信息失败：', error.message || error)
    }
  },

  /**
   * 发布模块
   * @param {string} name 模块名称
   * @param {string} dependent 是否将依赖的模块上传
   */
  async publish(name, dependent) {
    const push = apps => {
      const app = apps.pop()
      if (!app) {
        console.log('全部完成！')
      } else {
        const outputFile = pathJoin('dist', app + '.zip')
        const output = fs.createWriteStream(outputFile)
        const archive = archiver('zip', {
          zlib: { level: 9 }
        })
        archive.pipe(output)
        archive.directory(pathJoin('src', app + '/'), false)
        archive.finalize()

        output.on('finish', async () => {

          const buffer = fs.readFileSync(outputFile)
          const hash = crypto.createHash('md5')
          hash.update(buffer, 'utf8')
          const md5 = hash.digest('hex')
          try {
            await user.request('package/version/push', 'POST', outputFile, {
              formData: {
                md5,
                name: app,
                type: 'duxapp',
                app,
              }
            })
            console.log(app + ' 发布成功')
          } catch (error) {
            // 版本号较低时自动更新版本号
            if (error.message.startsWith('This version has been released')) {
              const appJson = require(pathJoin('src', app, 'app.json'))

              const versions = error.message.split(':')[1].split('.')
              versions[2] = +versions[2] + 1
              const newVersion = versions.join('.')

              const { confirm } = await inquirer.prompt([
                {
                  type: 'confirm',
                  name: 'confirm',
                  message: `${app}的版本号:${appJson.version}已过时，是否更新版本号为:${newVersion}继续发布？`,
                  validate(name) {
                    if (!name) {
                      return '请输入账户'
                    }
                    if (!/^1[\d]{10}$/.test(name)) {
                      return '手机号格式错误'
                    }
                    return true
                  }
                }
              ])
              if (confirm) {
                appJson.version = newVersion
                file.editFile(`src/${app}/app.json`, () => JSON.stringify(appJson, null, 2) + '\n')
                apps.push(app)
              } else {
                console.log(app + ' 未发布:版本号低于线上版本')
              }
            } else {
              console.log(app + ' 未发布:', error?.message || error)
            }
          }
          fs.unlinkSync(outputFile)
          push(apps)
        })
      }
    }
    if (dependent) {
      push(getApps(name))
    } else {
      push([name])
    }
  },

  /**
   * 创建app
   * @param name 名称
   * @param desc 简介
   */
  async create(name, desc) {
    if (!name || !desc) {
      console.log('请输入名称和简介')
    } else if (fs.existsSync(file.pathJoin('src', name)) || fs.existsSync(file.pathJoin('src', name))) {
      // 验证名称是否可用
      console.log('创建失败 此名称不可用')
    } else {
      // 使用模板创建app
      file.copy('node_modules/duxapp-cli/appTemplate', `src/${name}`)
      const edit = dir => {
        file.dirAndFileList(dir).forEach(fileName => {
          const fileDir = `${dir}/${fileName}`
          if (fs.lstatSync(file.pathJoin(fileDir)).isDirectory()) {
            edit(fileDir)
          } else {
            // 修改文件内容
            file.editFile(fileDir, content => {
              return content
                .replaceAll('{{name}}', name)
                .replaceAll('{{desc}}', desc)
            })
          }
        })
      }
      setTimeout(() => {
        edit(`src/${name}`)
      }, 200)
    }
  }
}

const getApps = (...customApps) => {
  // 获取app列表
  let apps = file.dirList('src')
  if (customApps.length) {
    // 筛选命令行中指定的app
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
  return apps
}

const getAppConfig = apps => {
  return Object.fromEntries(apps.map(name => [
    name,
    require(file.pathJoin('src', name, 'app.json'))
  ]))
}
