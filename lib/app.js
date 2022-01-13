/* eslint-disable import/no-commonjs */
const fs = require('fs')
const path = require('path')
const exec = require('child_process').exec
const file = require('./file')
const rn = require('./rn')
const android = require('./android')


module.exports = {
  async init(name) {
    if (!name) {
      console.log('请输入项目名称')
      process.exit(1)
    }
    if (!/^[a-z]{1,}$/.test(name)) {
      console.log('项目名称需要全部是小写字母')
      process.exit(1)
    }
    if (fs.existsSync(file.pathJoin(name))) {
      console.log('已经存在相同名称项目')
      process.exit(1)
    }
    try {
      console.log('[1/3]下载模板...')
      await asyncExec(`git clone https://e.coding.net/shaogongbra/duxapp/duxapp.git ${name}`)
      console.log('[2/3]模板处理中...')
      global.projectDir = path.join(global.projectDir, name)
      rn.packageName(name)
      rn.appName()
      await android.packageName()
      await android.keystore()
      console.log('[3/3]安装依赖(时间较长，你可以取消进程手动安装)...')
      await asyncExec(`cd ${name} && yarn`)
      console.log(`项目初始化成功 请打开 ${name} 目录，开始编码`)
    } catch (error) {
      console.log('初始化错误：', error.message)
    }
  }
}

const asyncExec = (...cmds) => {
  return new Promise((resolve, reject) => {
    const callback = prevInfo => {
      if (!cmds.length) {
        resolve(prevInfo)
        return
      }
      const item = cmds.shift()
      exec(item, (error, info) => {
        if (error) {
          reject(error)
        } else {
          callback(info)
        }
      })
    }
    callback()
  })
}
