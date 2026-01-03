/**
 * Frontend CLI - 主入口模块
 * 
 * 该模块是整个CLI工具的核心入口，负责：
 * 1. 初始化CLI环境
 * 2. 导出主要功能模块
 * 3. 提供统一的接口
 */

// 工具模块
const logger = require('./utils/logger')
const config = require('./utils/config')
const fileSystem = require('./utils/fileSystem')

module.exports = {
  
  // 工具函数
  logger,
  config,
  fileSystem,
  
  // 版本信息
  version: require('../package.json').version
}