import path from 'path'

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

  if (args.other.includes('--type rn') && args.other.includes('--watch') && !args.other.includes('--reset-cache')) {
    // RN端自动加上 --reset-cache
    const config = util.getBuildConfig()

    const entryApp = await util.getEntryApp(true)

    if (!config?.entryApp || entryApp.join(',') !== config.entryApp.join(',')) {
      args.other += ' --reset-cache'
    }
  }

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
  const startMetro = async () => {
    if (await util.isPortAvailable(8081)) {
      util.runInTerminal(`yarn start${args.duxapp}`)
    } else {
      console.log('8081端口被占用，不启动metro服务')
    }
  }
  switch (type) {
    case 'android':
      startMetro()
      await util.asyncSpawn(`react-native run-android --no-packager${args.other}`)
      break
    case 'debug:android':
      startMetro()
      await util.asyncSpawn(`.${path.sep}gradlew installDebug${args.other}`, {
        cwd: file.pathJoin('android')
      })
      break
    case 'build:android':
      await util.asyncSpawn(`.${path.sep}gradlew assembleRelease${args.other}`, {
        cwd: file.pathJoin('android')
      })
      break
    case 'ios': {
      startMetro()
      await util.asyncSpawn(`duxapp ios pod install${args.duxapp}`)
      await util.asyncSpawn(`react-native run-ios --no-packager${args.other}`)
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
  const nodeOptions = `${process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : ''}--no-experimental-require-module`
  const harmonyEnv = { ...process.env, NODE_OPTIONS: nodeOptions }
  await util.asyncSpawn(`duxapp runtime enterFile${args.duxapp}`)
  await util.asyncSpawn(`duxapp harmony create${args.duxapp}`)
  if (type === 'dev') {
    await util.asyncSpawn(`taro build --type harmony_cpp --watch${args.other}`, { env: harmonyEnv })
  } else {
    await util.asyncSpawn(`taro build --type harmony_cpp${args.other}`, { env: harmonyEnv })
  }
}

const getArgs = async () => {
  const args = await util.getArgv()
  const duxapp = args.argv.join(' ')
  const other = args.otherArgv.join(' ')
  return {
    args,
    duxapp: duxapp ? (' ' + duxapp) : '',
    other: other ? (' ' + other) : ''
  }
}
