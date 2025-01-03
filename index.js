#!/usr/bin/env node
/* eslint-disable no-shadow */
/* eslint-disable import/no-commonjs */

const fs = require('fs')
const path = require('path')
const jsdoc = require('jsdoc-api')

const util = require('./lib/util')
const file = require('./lib/file')

const args = util.getArgv().slice(2)

// 处理帮助信息
const helpIndex = args.findIndex(v => v === '-h' || v === '--help')
if (~helpIndex || args.length < 2) {
  const libDir = path.join(__dirname, 'lib')
  if (helpIndex === 0 || args.length < 2) {
    Promise.all(file.fileList(libDir, '.js').map(name => {
      return getDocs(name, file.readFile(name))
    })).then(res => {
      console.log('可用命令')
      showCommand(res.filter(v => v))
    })
  } else {
    const filePath = path.join(libDir, args[0] + '.js')
    getDocs(filePath, file.readFile(filePath)).then(res => {
      if (!res) {
        return console.log('指定的命令不存在')
      }
      if (helpIndex === 1) {
        console.log('可用命令')
        showCommand(res.list)
      } else {
        const fnInfo = res.list.find(v => v.name === args[1])
        if (!fnInfo) {
          return console.log('指定的命令不存在')
        }
        console.log(`${fnInfo.desc}`)
        showCommand(fnInfo.params)
      }
    })
  }
  return
}

function showCommand(list) {
  const max = Math.max(7, Math.max(...list.map(v => v.name.length))) + 2
  console.log(list.map(item => `${'  ' + item.name.padEnd(max, '                           ')}  ${item.desc}`).join('\n'))
  console.log(`
公共参数
  --app=     指定入口模块 大部分命令都需要指定这个参数
  --config=  指定配置 很多命令都可以指定这个参数(非必选) 少数命令必须指定这个参数
  -h --help  获取帮助
  
CLI文档
  https://duxapp.com/docs/course/started/cli`)

}

async function getDocs(filePath, source) {
  const names = filePath.split(path.sep)
  const name = names[names.length - 1].split('.')[0]
  const docs = (await jsdoc.explain({ source })).filter(v =>
    v.comment && v.comment.startsWith('/**')
    && v.longname
    && v.description
  )
  const start = docs.find(v =>
    v.longname === 'module.exports'
    && v.tags.some(t => t.title === 'app')
  )

  if (!start) {
    return
  }
  return {
    name,
    desc: start.description,
    list: docs.filter(v => v.kind === 'function' || v.longname?.startsWith('module.exports.')).map(v => {
      return {
        name: v.name,
        desc: v.description,
        params: v.params?.map(p => ({ name: p.name, desc: p.description })) || []
      }
    })
  }
}

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
