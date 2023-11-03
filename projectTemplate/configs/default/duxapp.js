
const config = {
  android: {
    appid: 'com.duxapp',
    appName: 'duxapp',
    versionCode: 1,
    versionName: '1.0.0',
    keystore: {
      storeFile: 'duxapp.keystore',
      keyAlias: 'duxapp',
      storePassword: 'WMm7AppBnSNpYteK',
      keyPassword: 'WMm7AppBnSNpYteK'
    }
  },
  /**
   * ios上传相关配置
   */
  ios: {
    BundleId: 'com.duxapp',
    appName: 'duxapp',
    versionCode: 1,
    versionName: '1.0.0',
    build: {
      // 项目目录 默认为 duxapp
      dirName: 'duxapp',
      // 应用商店上传账号
      account: 'yanglixia3337@dingtalk.com',
      // 不是账号密码，是在账户中心生成的密码
      password: 'efyt-ogrf-szgx-hieg',
      // 创建证书等操作
      issuerId: 'c516ef5e-5918-4620-9ae0-f61096c794c9',
      keyId: 'RSV8TAD26A',
      keyPath: 'AuthKey_RSV8TAD26A.p8',
      // 导出配置文件
      exportOptionsPlist: 'ExportOptions.plist'
    }
  },
  qiniu: {
    accessKey: 'tddCAA-Vehph1waxeIZcMIqrFIVzghMBfjz9KGen',
    secretKey: '7LYQnMUUXahg90EvlB2UdNICUpjyqZu5odWbfokS',
    bucket: 'pict-cdn',
    cdn: 'https://pictcdn.client.jujiang.me'
  },
  // 模块选项
  option: {
    /**
     * 热更新上传控制
     * 安卓和ios独立控制 设置common为公共参数
     * {
     *  token：账户设置中心生成的token
     *  account：上传的账号
     *  version：当前代码需要的原生app版本
     *  name：appcenter上的应用名称 不填写默认为package.json的 name + '-' + (ios或者android)
     * }
     */
    codepush: {
      common: {
        token: '09a115a7a099eafe25f32fcf5281ac257aa25aff',
        account: 'xj908634674-live.com',
        version: '^1.0.0'
      },
      android: {
        name: 'duxapp-android'
      },
      ios: {
        name: 'duxapp-ios'
      }
    },
  }
}

module.exports = config
