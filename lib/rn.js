/* eslint-disable import/no-commonjs */
const fs = require('fs')
const path = require('path')
const StreamZip = require('node-stream-zip')
const net = require('./net')
const file = require('./file')
const util = require('./util')

module.exports = {
  /**
   * 生成app图标
   * @param {string} filePath logo路径
   */
  async logo(config = 'default', filePath = 'logo.png') {
    filePath = path.join('configs', config, filePath)
    if (!fs.existsSync(file.pathJoin(filePath))) {
      console.log('请将logo放在配置目录下，将其命名为 logo.png')
      process.exit(1)
    }
    // 上传图片
    const { data } = await net.request('https://icon.wuruihong.com/icon/upload', 'POST', filePath, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    // 处理图片
    const generateData = {
      id: data,
      platforms: ['ios', 'android'],
      sizes: [],
      radius: 17.54,
      padding: 0,
      bgColor: null,
      iosLevel: '7+',
      androidFolder: 'mipmap',
      androidName: 'ic_launcher',
      position: 'cover_center',
      badge: { 'type': '无', 'color': '浅色' },
      shield: { 'enabled': false, 'start': 'Version', 'middle': '1.0.0', 'end': 'blue' }
    }
    const { success, message } = await net.request('https://icon.wuruihong.com/icon/generate', 'POST', generateData)
    if (!success) {
      console.log(message)
      process.exit(1)
    }
    // 下载解压图片
    const filename = 'logo.zip'
    await net.download('https://icon.wuruihong.com/icon/download/' + data, filename)
    const zip = new StreamZip({
      file: file.pathJoin(filename),
      storeEntries: true
    })
    zip.on('ready', () => {
      const copyPath = path.join('configs', config, 'copy')
      zip.extract('android/', file.pathJoin(copyPath, 'android/app/src/main/res'), () => {
        zip.extract('ios/AppIcon.appiconset/', file.pathJoin(copyPath, 'ios/duxapp/Images.xcassets/AppIcon.appiconset'), () => {
          // 删除zip
          file.delete(filename)
          zip.close()
        })
      })
    })
  },
  /**
   * 初始化项目codepush仓库
   * @param {string} os android 或者 ios
   */
  async codepushInit(os) {
    const config = codepushConfig(os)
    await util.asyncExec(
      `appcenter apps create -p React-Native -o ${os === 'android' ? 'Android' : 'iOS'} -d ${config.name} -n ${config.name} --token ${config.token}`,
      `appcenter codepush deployment add Production -a ${config.account}/${config.name} --token ${config.token}`,
      // `appcenter codepush deployment add Test -a ${config.account}/${config.name} --token ${config.token}`
    )
    console.log(`app名称 ${config.account}/${config.name}`)
  },
  async codepushDeploymentKey(os) {
    const config = codepushConfig(os)
    const res = await util.asyncExec(`appcenter codepush deployment list -a ${config.account}/${config.name} -k --token ${config.token}`)
    const keys = Object.fromEntries(res.split('\n').filter((item, index) => {
      return index % 2 === 1 && index > 2 && !!item
    }).map(item => {
      const reg = /[ ]{1,}[\da-zA-Z-_]{1,}[ ]{1,}/g
      return item.match(reg).map(v => v.trim())
    }))
    console.log(os + '端分支key：')
    console.log(res)
    return keys
  },
  /**
   * codepush热更新
   * @param {string} os android 或者 ios
   * @param {string} deployment 上传分支
   */
  async codepush(os = 'android', deployment = 'Production') {
    const config = codepushConfig(os)
    await util.asyncExec(`appcenter codepush release-react -a ${config.account}/${config.name} -t ${config.version} -d ${deployment} --use-hermes --token ${config.token}`)
    console.log(`codePush ${os}版 ${deployment}分支 发布成功`)
  }
}

const codepushConfig = os => {
  const config = { ...util.config(['option', 'codepush', 'common']), ...util.config(['option', 'codepush', os]) }
  if (!config.token) {
    console.log(`请配置${os}的上传token`)
    process.exit(1)
  }
  if (!config.account) {
    console.log(`请配置${os}的上传账号`)
    process.exit(1)
  }
  if (!config.name) {
    console.log(`请配置${os}的上传标识`)
    process.exit(1)
  }
  config.version = config.version || '^1.0.0'
  return config
}
