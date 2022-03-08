/* eslint-disable import/no-commonjs */
const net = require('./net')
const util = require('./util')

const request = (url, data) => {
  const config = util.config(['coding'])
  return net.request('https://e.coding.net/open-api', 'POST', { Action: url, ...data }, {
    headers: {
      Authorization: 'Bearer ' + config.token,
      Accept: 'application/json'
    }
  }).then(({ Response }) => {
    if (Response.Error) {
      throw Response.Error.Code + ': ' + Response.Error.Message
    }
    return Response
  })
}

const coding = {
  /**
   * 对项目初始化一个仓库
   * @param {string} name 项目名称
   * @param {string} displayName 显示名称
   * @param {string} description 项目描述
   */
  async init(name, displayName, description) {
    const projectId = await coding.createProject(name, displayName, description)
    await coding.createProjectMember(name)
    const depotID = await coding.createGitDepot(projectId, name, description)
    const depot = await coding.gitDepot(depotID)
    await util.asyncExec(`cd ${name} && git remote set-url origin ${depot.HttpsUrl} && git add . && git commit -m "${name}初始化" && git push`)
    console.log('代码已同步到coding')
    return depot
  },
  async clearRemote(name) {
    await util.asyncExec(`cd ${name} && git remote remove origin`)
  },
  async projectByName(name) {
    try {
      const { Project } = await request('DescribeProjectByName', {
        ProjectName: name
      })
      return Project
    } catch (error) {
      return
    }
  },
  async projectById(id) {
    const { Project } = await request('DescribeOneProject', {
      ProjectId: id
    })
    return Project
  },
  async createProject(name, displayName = name, description = displayName) {
    if (!name) {
      console.log('请输入项目名称')
    }
    const project = await coding.projectByName(name)
    if (project) {
      throw `${name}项目已存在`
    }
    const { ProjectId } = await request('CreateCodingProject', {
      Name: name,
      DisplayName: displayName || name,
      GitReadmeEnabled: false,
      VcsType: 'git',
      CreateSvnLayout: false,
      Shared: 0,
      ProjectTemplate: 'CODE_HOST',
      Description: description
    })
    console.log(`coding 创建项目 名称:${name} id:${ProjectId}`)
    return ProjectId
  },
  /**
   * 添加项目成员
   */
  async createProjectMember(projectName) {
    const project = await coding.projectByName(projectName)
    if (!project) {
      throw `项目不存在: ${projectName}`
    }
    const members = util.config(['coding', 'members'])
    const { Data: { TeamMembers } } = await request('DescribeTeamMembers', { PageNumber: 1, PageSize: 500 })
    const userList = TeamMembers.filter(item => members.some(member => {
      return /^\d{11}$/.test(member) ? item.Phone === member : item.Email === member
    }))
    if (!userList.length) {
      throw '没有要添加的成员'
    }
    await request('CreateProjectMember', {
      ProjectId: project.Id,
      Type: 80,
      UserGlobalKeyList: userList.map(item => item.GlobalKey)
    })
    console.log('coding 项目成员：' + userList.map(item => item.Name).join(' '))
    return userList
  },

  /**
   * 创建代码仓库
   * @param {number} projectId 项目id
   * @param {string} name 仓库名称
   * @param {string} description 仓库描述
   */
  async createGitDepot(projectId, name, description = name) {
    const { DepotId } = await request('CreateGitDepot', {
      ProjectId: projectId,
      DepotName: name,
      Description: description
    })
    console.log(`coding 创建仓库 id:${DepotId}`)
    return DepotId
  },
  /**
   * 获取仓库详情
   * @param {number} depotId 
   * @returns 
   */
  async gitDepot(depotId) {
    const { Depot } = await request('DescribeGitDepot', {
      DepotId: depotId
    })
    return Depot
  }
}

module.exports = coding