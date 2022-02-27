# duxapp项目创建工具

初始化duxapp项目，自动生成app图标，证书，修改包名等功能

## 使用

```bash
yarn add duxapp-cli
```

用 `yarn` 或者 `npm run` 运行下面的命令  

或者不安装到项目，使用npx运行命令，将下面的所有 `duxapp` 命令替换为 `npx duxapp-cli`  

## 支持的命令列表

### app

#### app init
初始化一个新的项目，appname只能用全英文小写，此命令暂时只支持内部使用，请勿执行
```bash
# 三个参数分别是 明显 显示名称 应用描述
duxapp app init name displayName description
```

### rn react-native端操作

#### rn appIcon

通过[图标工厂接口](https://icon.wuruihong.com)快速创建app图标
```bash
# 未指定图标，请将图标命名为 logo.png 放在项目根目录下
duxapp rn appIcon
# 或者指定图标位置
duxapp rn appIcon logo.png
```

#### rn appName

修改安卓和ios显示名称
```bash
duxapp rn appName app名称
```

#### rn appID

修改安卓端packageName  
修改ios端BundleID

相当于分别调用 `duxapp android packageName com.xxx.xxx` 和 `duxapp ios BundleID com.xxx.xxx`
```bash
duxapp rn appID com.xxx.xxx
```

#### rn pgyer

将安装包上传到蒲公英测试平台
```bash
duxapp rn pgyer 安装包路径
```
执行这个命令之前你需要在你的项目根目录下创建`duxapp.config.js`文件，内容如下
```javascript

const config = {
  /**
   * 蒲公英上传测试包key
   * 请到蒲公英获取下面两个参数并配置
   */
  pgyer: {
    apiKey: '',
    userKey: ''
  }
}

module.exports = config

```

#### rn clearBuildAssets
清除打包后的静态资源文件
```bash
duxapp rn clearBuildAssets android或者ios
```

#### rn codepushInit
初始化项目的codepushapp和分支
```bash
duxapp rn codepushInit android或者ios
```

使用codepush相关的功能需要提供以下配置

```javascript
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
  codePush: {
    common: {
      token: '',
      account: '',
      version: '^1.0.1'
    },
    android: {},
    ios: {}
  }
```
#### rn codepushDeploymentKey
查看当前项目分支和对应的key
```bash
duxapp rn codepushDeploymentKey android或者ios
```

#### rn buildCodepushFiles
将 `taro build:rn-android` 或者 `taro build:rn-ios` 命令打包后的静态文件打包成codepush可用的文件，打包后将会放在 `dist/code-push-android` 或者 `dist/code-push-ios` 下
```bash
duxapp rn buildCodepushFiles android或者ios

# 打包android到自定义文件夹
duxapp rn buildCodepushFiles android dist/code-push-android-test
```

#### rn codepush
将 `dist/code-push-android` 或者 `dist/code-push-ios` 下的文件发布到codepush
```bash
duxapp rn codepush android或者ios

# 发布安卓代码到测试分支
duxapp rn codepush android dist/code-push-android Test
```

### android

#### android packageName

修改安卓包名

```bash
duxapp android packageName com.xxx.xxx
```
### ios

#### ios BundleID

修改ios BundleID

```bash
duxapp ios BundleID com.xxx.xxx
```

#### ios upload

将ios的ipa安装包上传到应用商店  

```bash
duxapp ios upload aaa.ipa
```
要使用这个功能需要在配置文件提供账号和密码

```javascript
{
  ios: {
    // 应用商店上传账号
    account: '',
    // 不是账号密码，是在账户中心生成的密码
    password: ''
  }
}
```


### coding
coding代码仓库管理  
使用此功能需要配置 coding 如下
```javascript

const config = {
  /**
   * coding创建项目控制
   */
  coding: {
    token: '',
    /**
     * 需要添加到当前项目的成员
     * 用手机号或邮箱
     */
    members: []
  }
}

module.exports = config

```
#### coding createProject

创建一个coding项目
```bash
duxapp coding createProject name displayName description
```

#### coding createProjectMember

添加项目成员 需要配置 `coding.members`
```bash
duxapp coding createProjectMember projectName
```

### file

#### file move

将一个文件移动到另一个位置，或者是文件夹

```bash
duxapp android file move a b
```

#### file copy

将一个文件复制到另一个位置，或者是文件夹

```bash
duxapp android file copy a b
```

#### file delete

删除文件或文件夹

```bash
duxapp android file delete a
```

