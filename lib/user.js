const keytar = require('keytar')
const inquirer = require('inquirer')
const net = require('./net')

const serviceName = 'https://www.dux.plus'

const logout = async () => {
  let account = (await keytar.findCredentials(serviceName))[0]
  if (account) {
    await keytar.deletePassword(serviceName, account.account)
    console.log('已退出登录')
  } else {
    console.log('尚未登录 无需退出')
  }
}

const getAccount = async () => {
  let account = (await keytar.findCredentials(serviceName))[0]
  if (account) {
    return account
  }
  account = await inquirer.prompt([
    {
      type: 'input',
      name: 'account',
      message: '请输入账户(需在 https://www.dux.plus 进行注册)',
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
  // 保存账户密码
  keytar.setPassword(serviceName, account.account, account.password)
  console.log('登录成功')
  return account
}

const user = {
  login: getAccount,
  logout: logout,
  request: async (api, method, data, option) => {
    const account = await getAccount()
    let auth = `${account.account}:${account.password}`
    const buf = Buffer.from(auth, 'ascii')
    const res = await net.request('https://dux.plus/v/' + api, method, data, {
      ...option,
      headers: {
        Authorization: `Basic ${buf.toString('base64')}`,
        Accept: 'application/json',
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