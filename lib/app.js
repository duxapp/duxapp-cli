/* eslint-disable import/no-commonjs */
const fs = require('fs')
const path = require('path')
const plist = require('plist')
const file = require('./file')
const util = require('./util')
const rn = require('./rn')
const ios = require('./ios')
const { pathJoin } = require('./file')
const user = require('./user')

const asyncTimeOut = time => {
  let resolveFunc
  let rejectFunc
  const pro = new Promise((resolve, reject) => {
    resolveFunc = resolve
    rejectFunc = reject
  })
  const timer = setTimeout(() => resolveFunc({ code: 200, message: '倒计时结束', type: 'timeout' }), time)
  pro.clear = () => {
    clearTimeout(timer)
    rejectFunc({ code: 500, message: '清除倒计时' })
  }
  return pro
}

module.exports = {

  async init(name) {

    if (!/^[a-z][a-zA-Z_-\d]{1,}$/.test(name)) {
      console.log('名称不合法，小写字母开头，字母、数组或-或_组成')
    } else {
      global.projectDir = path.join(global.projectDir, name)
    }

  },

  /**
   * 添加app
   * @param  {...any} apps
   */
  async add(...apps) {
    if (!apps.length) {
      console.log('请输入要安装的模块')
    }
    try {
      const res = await user.request('package/version/query?type=duxapp&download=1', 'POST', Object.fromEntries(apps.map(app => [app, '1'])))

    } catch (error) {
      console.log('获取模块信息失败：', error.message)
    }
    return

    // 复制模块
    getApps(...apps).forEach(app => {
      file.delete(`src/${app}`)
      file.copy(`${duxappDir.join('/')}/src/${app}`, `src/${app}`)
    })
    // 复制公共文件
    const copyList = [
      'plugins', 'patches', 'config', 'config', '.gitignore',
      '.node-version', '.eslintrc', 'babel.config.js', 'jsconfig.json', 'global.d.ts',
      'react-native.config.js', 'yarn.lock',
      'src/app.config.js', 'src/app.js', 'src/app.scss', 'src/index.html'
    ]
    copyList.forEach(name => {
      file.delete(name)
      file.copy(`${duxappDir.join('/')}/${name}`, name)
    })

    // 复制package文件
    const packages = [require(pathJoin(`${duxappDir.join('/')}/package.json`)), require(pathJoin('package.json'))]
    packages[0].name = packages[1].name
    packages[0].version = packages[1].version
    packages[0].description = packages[1].description
    file.editFile('package.json', () => JSON.stringify(packages[0], null, 2))
    console.log('安装/更新完成 如果package.json更新了依赖 请执行yarn安装依赖')
  },

  // 发布模块
  /**
   * 发布模块
   * @param {string} name 模块名称
   * @param {string} dependent 是否将依赖的模块上传
   */
  async publish(name, dependent) {
    const push = app => {
    }
    push(name)
  },

  /**
   * 创建app
   * @param name 名称
   * @param desc 简介
   */
  async create(name, desc) {
    await getGit()
    if (!name || !desc) {
      console.log('请输入名称和简介')
    } else if (fs.existsSync(file.pathJoin(...duxappDir, 'src', name)) || fs.existsSync(file.pathJoin('src', name))) {
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
  },


  /**
   * 将安卓和ios升级到最新版
   * 是将新的安卓和ios拉取，但是保留现有配置
   * 安卓保留包名、证书、app名称、图标
   * ios保留包名、app名称、图标 （团队信息保留暂未开发）
   * 旧的文件将被移动到backup文件夹下
   */
  async updateRN() {
    const properties = file.readFile('android/gradle.properties')
    const names = ['APPID', 'MYAPP_RELEASE_STORE_FILE', 'MYAPP_RELEASE_KEY_ALIAS', 'MYAPP_RELEASE_STORE_PASSWORD', 'MYAPP_RELEASE_KEY_PASSWORD']

    const values = Object.fromEntries(names.map(name => {
      const reg = new RegExp(name + '=([a-zA-Z0-9_\\-.]{1,})')
      return [name, properties.match(reg)[1]]
    }))
    const { CFBundleDisplayName } = plist.parse(file.readFile(ios.dir('Info.plist')))

    // 将ios图标存储起来
    file.copy(ios.dir('Images.xcassets/AppIcon.appiconset'), 'dist/ios/appIcon')
    await asyncTimeOut(200)
    await file.move('android', 'backup/android')
    await file.move('ios', 'backup/ios')
    await getGit()
      // 复制公共文件
      ;['android', 'ios'].forEach(name => {
        file.copy(`${duxappDir.join('/')}/${name}`, name)
      })
    await asyncTimeOut(200)
    rn.appName(CFBundleDisplayName)
    await rn.appID(values.APPID)
    // 写入安卓包名
    file.editFile('android/gradle.properties', data => {
      names.slice(1).forEach(name => {
        const reg = new RegExp(name + '=([a-zA-Z0-9_\\-.]{1,})')
        data = data.replace(reg, `${name}=${values[name]}`)
      })
      return data
    })
    // 复制安卓证书
    file.copy('backup/android/app/' + values.MYAPP_RELEASE_STORE_FILE, 'android/app/' + values.MYAPP_RELEASE_STORE_FILE)
      // 复制安卓图标
      ;['mipmap-hdpi', 'mipmap-mdpi', 'mipmap-mdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi', 'playstore-icon.png'].forEach(name => {
        file.copy('backup/android/app/src/main/res/' + name, 'android/app/src/main/res/' + name)
      })
    // 复制ios图标
    file.delete(ios.dir('Images.xcassets/AppIcon.appiconset'))
    file.move('dist/ios/appIcon', ios.dir('Images.xcassets/AppIcon.appiconset'))
  },
}

const duxappDir = ['node_modules', 'duxapp-cli', 'duxapp']

const getApps = (...customApps) => {
  const srcDir = [...duxappDir, 'src'].join('/')
  // 获取app列表
  let apps = file.dirList(srcDir)
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
    require(file.pathJoin(...duxappDir, 'src', name, 'app.json'))
  ]))
}

const getGit = async () => {
  if (fs.existsSync(file.pathJoin(...duxappDir))) {
    await util.asyncExec(`cd ./${duxappDir.join('/')} && git pull`)
  } else {
    await util.asyncExec(`git clone https://e.coding.net/shaogongbra/duxapp/duxapp.git ${file.pathJoin(...duxappDir)}`)
  }
}
