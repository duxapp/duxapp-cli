const inquirer = require('inquirer')
const fs = require('fs')
const path = require('path')
const net = require('./net')

const USER_HOME = process.env.HOME || process.env.USERPROFILE
const duxappFile = path.join(USER_HOME, '.duxapp')

const duxapp = {
  read() {
    if (fs.existsSync(duxappFile)) {
      const config = fs.readFileSync(duxappFile, { encoding: 'utf-8' })
      if (!config) {
        return {}
      }
      try {
        return JSON.parse(config)
      } catch (error) {
        return {}
      }
    } else {
      return {}
    }
  },
  write(content) {
    fs.writeFileSync(duxappFile, JSON.stringify(content), { encoding: 'utf-8' })
  },
  getAccount() {
    const info = this.read()
    if (info.username && info.token) {
      return {
        username: info.username,
        password: info.token
      }
    }
  },
  setAccount(username, token) {
    this.write({
      ...this.read(),
      username,
      token
    })
  },
  clearAccount() {
    const data = this.read()
    delete data.username
    delete data.token
    this.write(data)
  }
}

const getAccount = async (username, password) => {
  let account = duxapp.getAccount()
  if (account) {
    return account
  }
  if (username && password) {
    account = {
      username,
      password
    }
  } else {
    account = await inquirer.prompt([
      {
        type: 'input',
        name: 'username',
        message: '请输入账户(需在http://www.dux.cn进行注册)',
        validate(name) {
          if (!name) {
            return '请输入账户'
          }
          if (!/^1[\d]{10}$/.test(name)) {
            return '手机号格式错误'
          }
          return true
        }
      },
      {
        type: 'password',
        name: 'password',
        message: '请输入密码',
        validate(password) {
          if (!password) {
            return '请输入密码'
          }
          return true
        }
      }
    ])
  }

  // 登录
  try {
    const res = await net.request('https://dux.plus/v/package/auth/token', 'POST', account)
    if (res.code === 200) {
      // 保存账户密码
      duxapp.setAccount(account.username, res.data.token)
      console.log('登录成功!')
      return { password: res.data.token }
    } else {
      throw res
    }
  } catch (error) {
    console.error('登录失败:' + error.message)
  }
}

const logout = () => {
  if (duxapp.getAccount()) {
    duxapp.clearAccount()
    console.log('已退出登录')
  } else {
    console.log('尚未登录 无需退出')
  }
}

const user = {
  login: getAccount,
  logout,
  request: async (api, method, data, option) => {
    const account = await getAccount()
    if (!account) {
      throw {
        message: '用户未登录'
      }
    }
    const res = await net.request('https://dux.plus/v/' + api, method, data, {
      ...option,
      headers: {
        Authorization: account.password,
        ...option?.headers
      }
    })

    if (res.code === 200) {
      return res.data
    } else if (res.code === 401) {
      // 退出登录
      console.log('账号信息失效，请重新登录')
      logout()
    }
    throw res
  }
}

module.exports = user
