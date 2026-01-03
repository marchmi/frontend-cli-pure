#!/usr/bin/env node

const requiredVersion = extractVersion(require('../package.json').engines.node);
const currentVersion = extractVersion(process.version); // 移除 'v' 前缀
const pkgName = require('../package.json').name;
/**
 * 检查Node版本是否符合要求
 * @param {string} wanted - 要求的Node版本
 * @param {string} id - 项目或工具名称
 */
checkNodeVersion(requiredVersion, pkgName);

// 依赖检查
try {
  require.resolve('commander')
  require.resolve('inquirer')
  require.resolve('chalk')
} catch (err) {
  console.error('❌ 缺少必要的依赖包，请运行: npm install')
  process.exit(1)
}

const program = require('commander')
const chalk = require('chalk')
const { version, description } = require('../package.json')

/**
 * 命令行程序配置
 */
program
  .name('frontend')
  .description(description)
  .version(version)

// 导入命令模块
const createCommand = require('../lib/commands/create')

// 注册命令
createCommand(program)

// 帮助信息增强
program.on('--help', () => {
  console.log()
  console.log(`  💡 提示: 使用 ${chalk.cyan('frontend <command> --help')} 查看详细使用说明`)
  console.log()
})

/**
 * 版本比较工具函数
 * @param {string} current - 当前版本
 * @param {string} required - 要求版本
 * @returns {number} 比较结果
 */
function compareVersions(current, required) {
  const currentParts = current.split('.').map(Number)
  const requiredParts = required.split('.').map(Number)
  
  for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
    const currentPart = currentParts[i] || 0
    const requiredPart = requiredParts[i] || 0
    
    if (currentPart < requiredPart) return -1
    if (currentPart > requiredPart) return 1
  }
  
  return 0
}

/**
 * 检查Node版本是否符合要求
 * @param {string} wanted - 要求的Node版本
 * @param {string} id - 项目或工具名称
 */
function checkNodeVersion(wanted, id) {
  if (compareVersions(currentVersion, wanted) < 0) {
    console.log(
      '❌ You are using Node ' +
        currentVersion +
        ', but this version of ' +
        id +
        ' requires Node ' +
        wanted +
        '.\nPlease upgrade your Node version.'
    );
    process.exit(1);
  }
}

/**
 * 从字符串中提取版本号
 * @param {string} str - 包含版本号的字符串，如 ">1.2.3", "v1.0.0", "版本: 2.1.4"
 * @returns {string|null} - 返回提取到的版本号或 null
 */
function extractVersion(str) {
  const regex = /(\d+(?:\.\d+)+)/;
  const match = str.match(regex);
  return match ? match[0] : null;
}

// 解析命令行参数 输出帮助信息
program.parse()