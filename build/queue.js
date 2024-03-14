const fs = require('fs')
const runtime = require('../lib/runtime')

const path = require('path')

const util = require('../lib/util')

const net = require('../lib/net')

const ci = require('miniprogram-ci')

const config = require('./config.js')

const mapping = config.mapping

const tasksFilePath = './tasks.json'

// 任务列表
const taskQueue = []
// 任务状态
let taskStatus = false

const resultNotify = (url, id, err) => {
  const run = async (level = 0) => {
    if (level > 5) {
      return console.log('通知超过最大次数')
    }
    try {
      console.log('通知：', url, {
        code: err ? 500 : 200,
        message: err || '',
        id
      })
      const res = await net.request(url, 'POST', {
        code: err ? 500 : 200,
        message: err || '',
        id
      })
      if (res !== 'OK') {
        throw '服务器返回错误状态'
      }
    } catch (error) {
      console.log('通知失败：', error)
      setTimeout(() => run(level + 1), (level + 1) * 3000)
    }
  }
  run()
}

/**
 * 队列打包
 * @param {*} data
 * @returns
 */
const build = async (id, data) => {
  const buildType = weapp.type || 'weapp'
  try {
    // 修改配置文件
    runtime.editConfig(data.config || {}, mapping, 'default/index.origin.js', 'default')
    // 服务器会自动同步
    // await util.asyncExec('git pull')
    // 安装依赖
    await util.asyncExec('yarn')
    // 打包小程序
    await util.asyncExec(`yarn build:${buildType} --app=${config.app}`)
    if (data.upload?.appid && data.upload?.key) {
      // 上传到小程序
      // 保存key到临时文件
      const keyFile = path.resolve(process.cwd(), 'dist/weapp.key')
      fs.writeFileSync(keyFile, data.upload.key, 'utf-8')
      const project = new ci.Project({
        appid: data.upload.appid,
        type: 'miniProgram',
        projectPath: path.resolve(process.cwd(), 'dist/weapp'),
        privateKeyPath: keyFile,
        // ignores: ['node_modules/**/*'],
      })
      fs.unlinkSync(keyFile)
      const uploadResult = await ci.upload({
        project,
        version: data.upload.version || '1.0.0',
        desc: data.upload.desc || '平台上传',
        setting: {
          es6: false,
          minifyJS: false,
          minifyWXML: true,
          minifyWXSS: true,
          autoPrefixWXSS: false,
          minify: false
        },
        // onProgressUpdate: console.log,
      })
      data.notifyUrl && resultNotify(data.notifyUrl, id)
    } else {
      // 做其他操作
      throw '未上传小程序 因为参数未传入'
      // 生成压缩包
      // const zipFile = new AdmZip()
      // zipFile.addLocalFolder(path.resolve(process.cwd(), 'dist/weapp'))
      // const zipFileName = `weapp-${new Date().getTime()}.zip`
      // const zipFilePath = path.resolve(process.cwd(), 'dist', zipFileName)
      // fs.writeFileSync(zipFilePath, zipFile.toBuffer())
      // // 上传到7牛云
      // // const url = qiniu.upload(zipFilePath, zipFileName)
      // const url = await util.asyncExec(`yarn duxapp qiniu upload ${zipFilePath} ${zipFileName}`)

      // fs.unlinkSync(zipFilePath)

      // return url.split('下载地址：')[1].split('\n')[0]
    }
  } catch (error) {
    console.log('打包失败：', error)
    data.notifyUrl && resultNotify(data.notifyUrl, id, error)
  }
}

// 加载之前保存的任务
function loadTasksFromFile() {
  try {
    const tasksData = fs.readFileSync(tasksFilePath, 'utf8')
    if (tasksData) {
      const savedTasks = JSON.parse(tasksData)
      if (savedTasks?.length) {
        taskQueue.push(...savedTasks)
        console.log('任务加载成功:', savedTasks.length || 0)
        processNextTask()
      }
    }
  } catch (error) {
    console.error('任务加载失败:', error)
  }
}

// 保存任务到文件
function saveTasksToFile() {
  try {
    fs.writeFileSync(tasksFilePath, JSON.stringify(taskQueue, null, 2), 'utf8');
    // console.log('Tasks saved to file.');
  } catch (error) {
    console.error('任务保存失败:', error.message);
  }
}

// 模拟处理任务
async function processTask(task) {
  try {
    console.log('开始任务:', task.id, task.data);
    // 模拟任务执行时间
    await build(task.id, task.data);
    // console.log('任务完成:', task.id);
    // 从队列中删除已完成的任务
    const taskIndex = taskQueue.findIndex(item => item.id === task.id);
    if (taskIndex !== -1) {
      taskQueue.splice(taskIndex, 1);
      saveTasksToFile(); // 保存更新后的任务列表
    }
  } catch (error) {
    console.log('任务失败:', task.id, error);
    // 从队列中删除失败的任务
    const taskIndex = taskQueue.findIndex(item => item.id === task.id);
    if (taskIndex !== -1) {
      taskQueue.splice(taskIndex, 1);
      saveTasksToFile(); // 保存更新后的任务列表
    }
  }
}

// 启动时加载任务
loadTasksFromFile()

// 添加任务到队列
function addToQueue(taskData) {
  const newTask = {
    id: new Date().getTime(),
    data: taskData,
  };
  taskQueue.push(newTask);
  saveTasksToFile(); // 保存更新后的任务列表
  processNextTask(); // 开始处理队列任务

  return newTask.id
}


// 处理下一个任务
function processNextTask() {
  if (taskStatus) {
    return
  }
  const run = () => {
    if (taskQueue.length > 0) {
      taskStatus = true
      const nextTask = taskQueue[0];
      processTask(nextTask).then(() => {
        run(); // 递归调用处理下一个任务
      });
    } else {
      console.log('所有任务完成.');
      taskStatus = false
    }
  }
  run()
}

module.exports = {
  add: addToQueue
}
