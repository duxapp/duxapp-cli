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

### npm

用于管理模块的npm依赖相关的命令

#### npm add

给模块添加依赖，添加依赖规则将会以 `~` 的形式添加进去

```bash
# 给 duxui 模块添加 dayjs 插件
duxapp npm add dayjs --app duxui
# 指定版本号添加
duxapp npm add dayjs@1.0.0 --app duxui
# 一次性添加多个依赖
duxapp npm add dayjs@1.0.0 duxapp-cli --app duxui
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

### 模块管理

#### 添加模块
```bash
yarn duxapp app add duxui duxcms
```
添加模块时会自动计算并保存模块的完整性校验信息到 `modules.json` 文件中。

#### 检查模块完整性
```bash
# 检查特定模块
yarn duxapp app checkIntegrity duxui

# 检查所有已安装模块
yarn duxapp app checkIntegrity
```
此命令会验证模块文件是否被修改，并显示具体哪些文件发生了变化。

