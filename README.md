# duxapp项目创建工具

初始化duxapp项目，自动生成app图标，证书，修改包名等功能

## 使用

```bash
yarn add duxapp-cli
```

或者使用npx，将下面的所有 `duxapp` 命令替换为 `npx duxapp-cli`

## 支持的命令列表

### APP

#### app init
初始化一个新的项目，appname只能用全英文小写，此命令暂时只支持内部使用，请无执行
```bash
duxapp app init appname
```

### rn

#### rn appIcon

通过https://icon.wuruihong.com/快速创建app图标
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

### android

#### android packageName

修改安卓包名

```bash
duxapp android packageName com.xxx.xxx
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

