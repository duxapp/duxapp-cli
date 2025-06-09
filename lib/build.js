const file = require('./file')
const util = require('./util')

/**
 * duxapp统一编译工具
 * @app
 */
module.exports = {

  /**
   * Taro命令统一封装
   */
  async _index() {
    const args = getArgs(1)
    await util.asyncSpawn(`duxapp runtime enterFile${args.duxapp}`)
    await util.asyncSpawn(`taro build${args.other}`)
  },

  /**
   * RN端编译命令
   * @param type 命令
   */
  async rn(type) {
    const args = getArgs(3)
    await util.asyncSpawn(`duxapp runtime enterFile${args.duxapp}`)
    switch (type) {
      case 'android':
      case 'debug:android':
      case 'build:android': {
        await util.asyncSpawn(`duxapp rn create${args.duxapp}`)
        if (type === 'android') {
          await util.asyncSpawn(`react-native run-android${args.other}`)
        } else if (type === 'debug:android') {
          await util.asyncSpawn(`./gradlew installDebug${args.other}`, {
            cwd: file.pathJoin('android')
          })
        } else if (type === 'build:android') {
          await util.asyncSpawn(`./gradlew assembleRelease${args.other}`, {
            cwd: file.pathJoin('android')
          })
        }
        break
      }
      case 'ios': {
        await util.asyncSpawn(`duxapp rn create${args.duxapp}`)
        await util.asyncSpawn(`duxapp ios pod install${args.duxapp}`)
        await util.asyncSpawn(`react-native run-ios${args.other}`)
        break
      }
    }
  },

  /**
   * 鸿蒙端编译命令
   * @param type 命令
   */
  async harmony(type) {
    const args = getArgs(3)
    await util.asyncSpawn(`duxapp runtime enterFile${args.duxapp}`)
    await util.asyncSpawn(`duxapp harmony create${args.duxapp}`)
    if (type === 'dev') {
      await util.asyncSpawn(`taro build --type harmony_cpp --watch${args.other}`)
    } else {
      await util.asyncSpawn(`taro build --type harmony_cpp${args.other}`)
    }
  }
}

const getArgs = (slice = 0) => {
  const duxappArgs = []
  const otherArgs = []
  const duxappParams = ['app', 'config']
  const args = process.argv.slice(2 + slice)
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const name = duxappParams.find(key => arg.startsWith(`--${key}=`) || arg === `--${key}`)
    if (name) {
      const key = `--${name}`
      if (arg === key) {
        i++
        duxappArgs.push(`${arg}=${args[i]}`)
      } else {
        duxappArgs.push(arg)
      }
    } else {
      otherArgs.push(arg)
    }
  }
  const duxapp = duxappArgs.join(' ')
  const other = otherArgs.join(' ')
  return {
    duxapp: duxapp ? (' ' + duxapp) : '',
    other: other ? (' ' + other) : ''
  }
}
