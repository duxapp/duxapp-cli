# duxapp项目创建工具

初始化duxapp项目，自动生成app图标，证书，修改包名等功能

## 使用

```bash
yarn add duxapp-cli
```

用 `yarn` 或者 `npm run` 运行下面的命令  

或者不安装到项目，使用npx运行命令，将下面的所有 `duxapp` 命令替换为 `npx duxapp-cli`  

## 支持的命令列表

### create

初始化一个新的项目
```bash
duxapp create 项目名称
```

### app

#### app add
添加、更新模块，支持批量添加 会同步更新所依赖的模块
```bash
duxapp app add 模块1 模块2
```

如果遇到 项目名称/dist/xx.zip不存在 的错误，可以尝试在项目根目录下创建一个dist文件夹后重试

#### app publish
发布模块
```bash
duxapp app add 模块名称
```

发布模块 并且发布依赖的模块
```bash
duxapp app add 模块名称 1
```

#### app create
创建一个模块
```bash
duxapp app create 模块名称 模块描述
```

### project

#### project clearStatic
清理项目没用到的静态资源文件
```bash
duxapp project clearStatic
```


### rn react-native端操作

####  rn create
创建RN打包环境
```bash
# 需要同时指定模块和配置才能创建成功
duxapp rn appIcon --app=模块 --config=配置名称
```

#### rn logo

通过[图标工厂接口](https://icon.wuruihong.com)快速创建项目app图标
```bash
# 未指定图标，请将图标命名为 logo.png 放在配置目录下
duxapp rn logo --config=配置名称
# 或者指定图标位置 相对于配置目录
duxapp rn logo logo.png --config=配置名称
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
  option: {
    codepush: {
      common: {
        token: '',
        account: '',
        version: '^1.0.1'
      },
      android: {
        // 必填
        name: 'name-android'
      },
      ios: {
        // 必填
        name: 'name-ios'
      }
    }
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

#### android keystore

未项目配置生成证书

```bash
duxapp android keystore --config=项目配置
```
### ios

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

