#!/usr/bin/env node
/* eslint-disable no-shadow */
/* eslint-disable import/no-commonjs */

const fs = require('fs')
const path = require('path')

const utils = Object.fromEntries(fs
  .readdirSync(path.join(__dirname, 'lib'))
  .map(file => {
    const name = file.substring(0, file.length - 3)
    return [name, require('./lib/' + name)]
  }))

/**
 * 项目所在目录
 */
global.projectDir = process.cwd()

const category = process.argv[2]
let func = process.argv[3]
if (!utils[category]?.[func]) {
  func = '_index'
}
if (utils[category] && utils[category][func]) {
  const args = process.argv.slice(func === '_index' ? 3 : 4).filter(item => !item.startsWith('--'))
  try {
    const res = utils[category][func](...args)
    if (res instanceof Promise) {
      res.catch(error => {
        console.log('duxapp-cli 命令执行失败：', error)
        process.exit(1)
      })
    }
  } catch (error) {
    console.log('duxapp-cli 命令执行失败：', error)
    process.exit(1)
  }
} else {
  console.log((category || '') + ' ' + (func || '') + ' 命令不存在')
}
