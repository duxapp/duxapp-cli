const keytar = require('keytar')
const net = require('./net')

const serviceName = 'https://www.dux.plus'

const user = {
  request: async (url, method, data, option) => {
    const account = await getAccount()
    let auth = `${account.account}:${account.password}`
    const buf = Buffer.from(auth, 'ascii')
    return net.request(url, method, data, {
      ...option,
      headers: {
        Authorization: `Basic ${buf.toString('base64')}`,
        ...option?.headers
      }
    })
  }
}

module.exports = user

const getAccount = async () => {
  let account = keytar.findCredentials(serviceName)[0]
  if (account) {
    return account
  }
  account = await inquirer.prompt([
    {
      type: 'input',
      name: 'account',
      message: '请输入账户(手机号)',
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
  return account
}