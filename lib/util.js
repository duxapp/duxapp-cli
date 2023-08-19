/* eslint-disable import/no-commonjs */
const fs = require('fs')
const os = require('os')
const { exec } = require('child_process')
const file = require('./file')

const util = {
  /**
   * 判断当前操作系统
   */
  os() {
    const type = os.type()
    switch (type) {
      case 'Windows_NT':
        return 'Windows'
      default:
        return type
    }
  },
  randomString(len = 16) {
    len = len || 32
    const $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678'    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
    const maxPos = $chars.length
    let pwd = ''
    for (let i = 0; i < len; i++) {
      pwd += $chars.charAt(Math.floor(Math.random() * maxPos))
    }
    return pwd
  },
  json: {
    get(filename) {
      const data = fs.readFileSync(file.pathJoin(filename), { encoding: 'utf8' })
      return JSON.parse(data)
    },
    set(filename, content) {
      fs.writeFileSync(file.pathJoin(filename), JSON.stringify(content, null, 2), { encoding: 'utf8' })
    }
  },
  projectName() {
    return util.json.get('package.json').name
  },
  config(keys = [], exit = true) {
    const fileName = file.pathJoin('duxapp.config.js')
    if (!fs.existsSync(fileName)) {
      if (exit) {
        console.log('请在项目根目录下创建duxapp.config.js配置文件')
        process.exit(1)
      }
      return
    }
    const config = require(fileName)
    const res = util.recursionGetValue(keys, config)
    if (res === undefined) {
      if (exit) {
        console.log('请配置', keys.join('.'))
        process.exit(1)
      }
      return
    }
    return res
  },
  recursionGetValue(keys, data = {}, childKey, splice = false) {
    keys = typeof keys === 'string' ? keys.split('.') : [...keys]
    if (keys.length === 0) {
      return false
    } if (keys.length === 1) {
      return splice ? data.splice(keys[0], 1)[0] : data[keys[0]]
    } else {
      return util.recursionGetValue(keys.slice(1), childKey === undefined ? data[keys[0]] : data[keys[0]][childKey], childKey, splice)
    }
  },
  asyncExec(...cmds) {
    return new Promise((resolve, reject) => {
      const callback = prevInfo => {
        if (!cmds.length) {
          resolve(prevInfo)
          return
        }
        const item = cmds.shift()
        exec(item, {
          maxBuffer: 100 * 1024 * 1024,
        }, (error, info) => {
          if (error) {
            reject(error)
          } else {
            callback(info)
          }
        })
      }
      callback()
    })
  },
  getArgv() {
    const argv = JSON.parse(process.env.npm_config_argv)?.original || []
    return [...process.argv, ...argv]
  }
}

module.exports = util
