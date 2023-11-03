# DUXAPP
duxapp是基于Taro开发的模块化的前端框架，同时支持小程序、H5、ReactNative。
## 安装

```bash
npx duxapp-cli app init 项目名称
```

项目初始化后将会自动安装依赖，安装完成就可以打开项目进行开发了

## 使用
### 基本命令

```bash

# duxapp自定义命令参数：在上面的命令的基础上新增参数
# 调试小程序端 打包商城模块
yarn dev weapp --app=duxapp
# 调试小程序端 打包基础模块
yarn dev weapp --app=duxui
```
需要注意的是当同时调试多个端时，需要输入一致的`--app`参数

## 模块简介
duxapp是模块化的，模块之间还有相互依赖关系，src目录下的每个文件夹即是一个模块
### 模块目录结构
|  路径   | 说明 |
|  ----  | ----  |
| configs | 里面放项目配置文件 |
| src | 模块根目录 |
| --base  | 模块目录 |
| ---- components  | 模块组件目录 |
| ------ ......  | 导出模块的组件 |
| ---- config  | 配置 |
| ------ route.js  | 路由配置文件-模块必须的文件 |
| ------ ......  | 其他配置文件 |
| ---- utils  | 工具目录 |
| ------ ......  | 导出工具函数 |
| ---- update  | 项目兼容配置 |
| ---- app.js  | 模块入口文件 |
| ---- app.json  | 模块配置文件 定义模块名称、版本、依赖关系 |
| ---- index.js  | 模块出口文件，可以导出组件和方法提供给其他模块使用 |
| ---- ......  | 其他文件夹表示页面 |
| -- app.js  | 全局入口文件 自动生成 |
| -- app.scss  | 全局样式 自动生成 |
| -- app.config.js  | taro配置 自动生成 |
| -- index.html  | h5端首页文件 自动生成 |

### 模块命令

```bash
# 创建一个项目
yarn duxapp app init 项目名称
# 添加一个模块
yarn duxapp app add 模块名称
# 创建一个模块
yarn duxapp app create 模块名称
# 发布模块
yarn duxapp app publish 模块名称 是否发布依赖的模块
```
### 模块介绍
- 模块的依赖关系非常有用，可以在打包的时候自动寻找需要的模块，也可以在安装模块的时候自动寻找需要的模块
- 模块依赖请勿循环依赖 例如 A->B->A，或者A->B->C->A
- 如果A模块依赖于B模块，则可以在A模块中放心的导入B模块的组件和函数，反之没有依赖的模块不要导入他的任何东西，否则打包将会报错
- 一般来说新的模块至少需要依赖于base模块，因为base模块里面包含了很多基础工具和函数

### 入口文件

index.js是每个模块的入口文件，这个文件将会被默认执行，此文件需要导出一个默认对象，如下

```js
// 可以在此处执行一些要初始化的东西
import { app } from '@/base/utils'
app.register('duxshop')

export default {
  // 启动配置 位于duxapp.js文件中的option配置
  option: option => {
    setAppConfig(option.app || {})
  },
  // useLaunch
  launch: () => {
    route.init()
  },
  // useShow
  show: () => { },
  // useHide
  hide: () => { },
  // useEffect
  effect: async () => {
    startHide()
  }
}
```

## 新增功能介绍

### 路由

- 跳转路由直接返回数据到上一个页面

```js
// A页面
const { backData } await nav('shop/goods/list')

const data = await backData()

console.log(data) // { test: 1 }

// shop/goods/list页面
nav('back:', { test: 1 })
```

- switch优化新增参数

```js
// | 后面的是Tabbar组件指定的tabbarKey参数 商城端的tabbarKey是duxshop
nav('switch:0|duxshop')
```

- 监听路由跳转

```js
import { route }  from '@/base/utils'

// 比如在user模块监听路由跳转 判断是否需要登录 未登录的让其执行登录
// 如果在这个地方跑出错误，则跳转不会成功
// 注意这个函数的返回值是一个Promise
route.onNavBefore(async pageRouter => {
  if (pageRouter?.login && !this.isLogin()) {
    // 执行登陆 登陆成功后继续跳转
    await this.login()
    // 让路由在停顿一会之后再继续执行
    await asyncTimeOut(100)
  }
})
```
- HOOK

```js
import { useRoute }  from '@/base/utils'
// 是用hook接收参数将有别于 Taro自带的接口参数方式
// useRoute接收到的参数可以是任何类型的，比如函数
const { path, params } = useRoute()
```
- 路由函数

```js
import { route }  from '@/base/utils'

route.push('shop/goods/list') // 等同于nav('shop/goods/list')
route.redirect('shop/goods/list') // 等同于nav('redirect:shop/goods/list')
route.back(1) // 等同于nav('back:1')
```

### 模块
有些特殊情况下，你需要使用没有依赖的模块里面的内容，但是这种情况极少，也要避免这种情况出现，日过数显了可以使用app库

- 注册模块
请在每个app里面都调用一下注册app的函数，第二个参数是可选的

```js
import { app }  from '@/base/utils'

// 注册用户模块示例
app.register('user', {
  getUserId: user.getUserID,
  isLoing: user.isLogin,
  login: user.login,
  getUserInfo: user.getUserInfo,
  loginOut: user.loginOut,
  onLoginStatus: user.onLoginStatus,
  setInfo: user.setInfo,
  setKey: user.setKey,
  setLoginStatus: user.setLoginStatus
})
```
- 使用没有依赖的模块的方法

```js
import { app }  from '@/base/utils'

if(app.isApp('user')) {
  // 第一个参数模块名称 第二个参数方法名称 后面的参数将会传入到这个方法
  app.method('user', 'getUserId')
}
```

### 请求上传

request已经移除了request、upload等函数，无法直接导入这些函数，而是提供了创建这些函数的函数。由于配合模块化，每个模块可能对接的是不同的后台，需要不同的请求参数

- createRequest

```js
const { request, throttleRequest, middle } = createRequest({
  // congig和之前的请求配置一致
  config: {
    request: {},
    result: {},
    upload: {}
  },
  // 默认使用的中间件（请求拦截）
  middle: {

  }
})

// middle是添加中间件的工具，使用示例如下，
// 第二个参数是是否全局中间件，全局的话不管什么时候创建的request都会生效
// middle有三处拦截器 before请求之前 result请求结果 error请求错误 如果在异步中抛出错误 request请求也会直接报错对应的错误

// 如监听请求，在请求头里面设置用户鉴权信息
middle.before(async params => {
  let { token: userToken = '' } = shopUser.getUserInfo()
  const token = Base64.stringify(hmacSHA1(config.appid + config.secret, config.secret))
  // 开启调试
  config.devOpen && (userToken = config.devToken)
  params.header.Authorization = `Dux ${config.appid}:${token}:${userToken}`
  return params
})

export {
  request,
  throttleRequest,
  middle
}
```

- createUpload
上传于request类似，区别在于上传的result中间件的参数是一个数组，需要处理每一个结果

```js
const { upload, uploadTempFile, middle } = createRequest({
  // congig和之前的请求配置一致
  config: {
    request: {},
    result: {},
    upload: {}
  },
  // 默认使用的中间件（请求拦截）
  middle: {

  }
})

export {
  upload,
  uploadTempFile,
  middle
}
```

### user模块
用户模块用来管理用户信息，执行登录、退出登录等操作，需要用到用户信息的模块都需要依赖于user模块，user模块默认依赖于base模块。

- 原理介绍  
用户模块不提供具体的登录、注册找回密码登逻辑，只管理用户信息和登录状态  
当一个模块需要管理用户信息时，需要在user模块注册对应的方法才能使用  
user模块有两种模式，进来就要登录和在需要登录的地方才登录，默认是第二种

- 注册一个用户管理  
下面示例是注册商城系统的用户模块方法

```jsx

// 登录组件
const UserLogin = ({
  // start强制登录页面 login一般登录页面
  type,
  // 登录成功回调
  onLogin
}) => {

  return <View onClick={() => onLogin({
    // 登录类型 account账号登录 weapp小程序登录 wechat微信h登录 wechatApp app端微信登录
    type,
    // 用户信息
    data
  })}>登录</View>
}

user.register('duxshop', {
  // 登录页面组件
  UserLogin,
  // 当前是否开启了调试模式
  devOpen: config.devOpen,
  // 用于判断是否登录的方法
  isLogin: data => !!data?.token,
  // 用户用户id的回调
  getUserID: data => data?.user_id,
  // 获取h5端的登录地址
  getH5WechatLoginUrl: async () => {
    const onlineConfig = await getConfig()
    const { loginUrl } = onlineConfig.wechat
    return loginUrl
  }
})
```

- 配置  
当有多个模块都注册了登录功能，可以通过配置指定默认使用哪个，具体是配置duxapp.js文件中的 `option.user.use`  
如果要开启强制登录模式，请配置 `openPages` 在数组中添加一项 `user/auth/start`


- HOOK

```js
// info就是登录的时候的用户信息
// user同user工具库
const [info, loginStatus, user] = user.useUserInfo('duxshop')
```

- user工具库

```js
import { user } from '@/user/utils'

// 获取的用户信息
user.getUserInfo()

// 指定获取注册的用户信息
user.getUserInfo('duxshop')

// 设置用户信息 第二个可省略
user.setInfo({avatar: ''}, 'duxapp')

// 设置单个字段的用户信息 第三个参数可省略
user.setKey('avatar', '', 'duxapp')

// 同步放回用户是否登录 和以前的 isLogin功能一致
user.isLogin()

// 去登录 和以前的login功能一致
user.login()

// 退出登录 和以前的loginOut功能一致
user.loginOut()

// 获取用户id
user.getUserID()

// 监听用户状态变化 和之前的onUserStatus类似
const { remove } = user.onLoginStatus(status => {
  // status true 登录 false 退出登录
  // 如果用户是登录的状态下执行监听 默认会调用一次status 为 true
})
// 移除监听
remove()

```
