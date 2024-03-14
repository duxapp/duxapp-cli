const http = require('http')
const queue = require('./queue')

const service = http.createServer()

// 获取端口号

const getArgv = () => {
  const npm_config_argv = process.env?.npm_config_argv
  const argv = npm_config_argv ? JSON.parse(process.env.npm_config_argv)?.original : []
  return [...process.argv, ...argv]
}

let port = 3000
const _port = getArgv().find(item => item.startsWith('--port='))
if (_port) {
  port = +_port.split('=')[1]
}

service.listen(port, () => {
  console.log('服务启动成功: http://localhost:' + port)
})

service.on('request', (req, res) => {

  if (req.method === 'POST') {

    let data = ''

    //2.注册data事件接收数据（每当收到一段表单提交的数据，该方法会执行一次）
    req.on('data', chunk => {
      // chunk 默认是一个二进制数据，和 data 拼接会自动 toString
      data += chunk
    })

    req.on('end', async () => {
      try {
        data = JSON.parse(data)
        const id = queue.add(data)

        const resData = {
          id
        }

        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8'
        })

        res.end(JSON.stringify(resData))
      } catch (error) {
        console.log('error', error)
        res.writeHead(500, {
          'Content-Type': 'text/html; charset=utf-8'
        })
        res.end(JSON.stringify(error))
      }
    })
  } else {
    res.writeHead(500, {
      'Content-Type': 'text/html; charset=utf-8'
    })
    res.end('使用POST请求')
  }
})

