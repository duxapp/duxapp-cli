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
duxapp app init appname
```

### rn

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

