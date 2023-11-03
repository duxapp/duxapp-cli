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
初始化一个新的项目，此命令暂时只支持内部使用，请勿执行
```bash
duxapp app init
```


### project

#### project clearStatic
清理项目没用到的静态资源文件
```bash
duxapp project clearStatic
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

#### rn codepush
发布热更新代码
```bash
duxapp rn codepush android或者ios
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

### file

#### file move

将一个文件移动到另一个位置，或者是文件夹

```bash
duxapp file move a b
```

#### file copy

将一个文件复制到另一个位置，或者是文件夹

```bash
duxapp file copy a b
```

#### file delete

删除文件或文件夹

```bash
duxapp file delete a
```

