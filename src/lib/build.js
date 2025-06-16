import * as file from './file.js'
import * as util from './util.js'

/**
 * duxapp统一编译工具
 * @app
 */
const app = 'build'

/**
 * Taro命令统一封装
 * @function
 */
export const _index = async () => {
  const args = await getArgs()
  await util.asyncSpawn(`duxapp runtime enterFile${args.duxapp}`)
  await util.asyncSpawn(`taro build${args.other}`)
}

/**
 * RN端编译命令
 * @function
 * @param type 命令
 */
export const rn = async type => {
  const args = await getArgs()
  await util.asyncSpawn(`duxapp runtime enterFile${args.duxapp}`)
  await util.asyncSpawn(`duxapp rn create${args.duxapp}`)
  switch (type) {
    case 'android':
      await util.asyncSpawn(`react-native run-android${args.other}`)
      break
    case 'debug:android':
      await util.asyncSpawn(`./gradlew installDebug${args.other}`, {
        cwd: file.pathJoin('android')
      })
      break
    case 'build:android':
      await util.asyncSpawn(`./gradlew assembleRelease${args.other}`, {
        cwd: file.pathJoin('android')
      })
      break
    case 'ios': {
      await util.asyncSpawn(`duxapp ios pod install${args.duxapp}`)
      await util.asyncSpawn(`react-native run-ios${args.other}`)
      break
    }
  }
}

/**
 * 鸿蒙端编译命令
 * @function
 * @param type 命令
 */
export const harmony = async type => {
  const args = await getArgs()
  await util.asyncSpawn(`duxapp runtime enterFile${args.duxapp}`)
  await util.asyncSpawn(`duxapp harmony create${args.duxapp}`)
  if (type === 'dev') {
    await util.asyncSpawn(`taro build --type harmony_cpp --watch${args.other}`)
  } else {
    await util.asyncSpawn(`taro build --type harmony_cpp${args.other}`)
  }
}

const getArgs = async () => {
  const args = await util.getArgv()
  const duxapp = args.argv.join(' ')
  const other = args.otherArgv.join(' ')
  return {
    duxapp: duxapp ? (' ' + duxapp) : '',
    other: other ? (' ' + other) : ''
  }
}
