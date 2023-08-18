const { enterFile } = require('../lib/runtime')

/**
 * duxapp框架插件
 * eg.
 * taro build --type rn --config rn.output.ios=./ios/tmp/main.jsbundle
 * 将修改config中的rn output ios 字段的值为 ./ios/tmp/main.jsbundle
 */
module.exports = (() => {
  return ctx => {
    ctx.onBuildStart(enterFile)
  }
})()
