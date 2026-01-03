/**
 * CreateCommand - 项目创建命令
 * 
 * 命令格式：
 *   frontend create <project-name> [options]
 *   fc <project-name> [options]
 * 
 * 选项：
 *   --preset <name>           使用预设配置
 *   --default                 使用默认配置
 *   --inline-preset <json>    内联JSON配置
 *   --package-manager <name>  指定包管理器
 *   --git [message]          初始化Git
 *   --no-git                 跳过Git初始化
 *   --force                  强制覆盖目录
 *   --merge                  合并目录
 * 
 * 开发指南：
 * - 实现完整的参数验证
 * - 提供友好的错误提示
 * - 集成进度显示
 * - 支持交互式配置
 */

const path = require('path')
const logger = require('../utils/logger')

/**
 * 注册Create命令
 * @param {Object} program - Commander实例
 * option('-p, --preset <presetName>', '使用预设配置')
 * -{*} 是命令行中输入的选项名称，--{*}是命令行选项在options中的键名 <*>是键值，不定义时，默认值为true
 * 命令行输入 -p 时， 后面接预设名称，例如：
 *   frontend create my-project --preset vue
 *  options解析出来就是：
 *  {
 *    preset: 'vue'
 *  }
 */
module.exports = function(program) {
  program
    .command('create <project-name>')
    .description('创建一个新的前端项目')
    .option('-p, --preset <presetName>', '使用预设配置')
    .option('-d, --default', '使用默认配置')
    .option('-i, --inline-preset <json>', '使用内联JSON配置')
    .option('-m, --package-manager <name>', '指定包管理器 (npm/yarn/pnpm)')
    .option('-g, --git [message]', '初始化Git仓库')
    .option('-n, --no-git', '跳过Git初始化')
    .option('-f, --force', '强制覆盖目标目录')
    .option('--merge', '合并目标目录')
    .option('-y, --yes', '跳过所有提示，使用默认配置')
    .action(createProject)
}

/**
 * 创建项目的主函数
 * @param {string} projectName - 项目名称
 * @param {Object} options - 命令行选项
 */
async function createProject(projectName, options) {
  try {
    logger.info(`🚀 开始创建项目: ${projectName}`)
    console.log('命令行选项:', options)
    // 1. 验证项目名称
    validateProjectName(projectName)

    // 2. 解析命令行选项
    const cliOptions = parseCliOptions(options)

    // 3. 确定项目路径

    // 4. 初始化提示模块

    // 5. 创建Creator实例
    
    // 6. 监听Creator事件


    // 7. 执行创建流程


    // 8. 显示成功信息
    

  } catch (error) {
    logger.error('项目创建失败:', error.message)
    
    // 提供有用的错误建议
    if (error.code === 'EACCES') {
      logger.error('权限不足，请检查目录权限')
    } else if (error.code === 'ENOSPC') {
      logger.error('磁盘空间不足')
    } else if (error.message.includes('Node.js版本')) {
      logger.error('请升级Node.js版本到12.0或更高版本')
    } else {
      logger.error('详细信息:', error.stack)
    }
    
    process.exit(1)
  }
}

/**
 * 验证项目名称
 * @param {string} name - 项目名称
 */
function validateProjectName(name) {
  // 检查名称是否为空
  if (!name || typeof name !== 'string') {
    throw new Error('项目名称不能为空')
  }

  // 检查名称长度
  if (name.length > 214) {
    throw new Error('项目名称过长（最多214个字符）')
  }

  // 检查名称格式（npm包名规范）
  const packageNameRegex = /^[a-z0-9-._~]+$/
  if (!packageNameRegex.test(name)) {
    throw new Error('项目名称只能包含小写字母、数字、点、连字符、下划线和波浪线')
  }

  // 检查保留名称
  const reservedNames = ['node_modules', '.git', '.svn', '.hg']
  if (reservedNames.includes(name.toLowerCase())) {
    throw new Error(`不能使用保留名称: ${name}`)
  }

  // 检查特殊名称
  const nodeCoreModules = ['http', 'https', 'querystring', 'path', 'fs', 'os']
  if (nodeCoreModules.includes(name.toLowerCase())) {
    throw new Error(`不能使用Node.js核心模块名称: ${name}`)
  }
}

/**
 * 解析命令行选项
 * @param {Object} options - 原始选项
 * @returns {Object} 解析后的选项
 */
function parseCliOptions(options) {
  const cliOptions = { ...options }

  // 处理内联预设
  if (options.inlinePreset) {
    try {
      cliOptions.inlinePreset = JSON.parse(options.inlinePreset)
    } catch (error) {
      throw new Error('无效的JSON格式内联预设')
    }
  }

  return cliOptions
}