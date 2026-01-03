/**
 * Logger - 日志工具类
 * 
 * 提供统一的日志输出接口：
 * 1. 不同级别的日志输出
 * 2. 美观的格式化输出
 * 3. 可配置的日志级别
 * 4. 颜色化输出支持
 * 5. 文件日志记录（可选）
 * 
 * 使用示例：
 *   logger.info('开始创建项目')
 *   logger.success('项目创建成功')
 *   logger.error('创建失败:', error)
 *   logger.debug('调试信息', { data })
 */

const chalk = require('chalk')

class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info'
    this.silent = options.silent || false
    this.timestamp = options.timestamp || false
    this.format = options.format || 'simple'
  }

  /**
   * 格式化日志消息
   * @param {string} level - 日志级别
   * @param {string} message - 消息
   * @param {*} args - 其他参数
   * @returns {string} 格式化后的消息
   */
  formatMessage(level, message, ...args) {
    const timestamp = this.timestamp ? `[${new Date().toISOString()}] ` : ''
    const prefix = this.getLevelPrefix(level)
    
    if (args.length > 0) {
      return `${timestamp}${prefix} ${message} ${args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
      ).join(' ')}`
    }
    
    return `${timestamp}${prefix} ${message}`
  }

  /**
   * 获取级别前缀
   * @param {string} level - 日志级别
   * @returns {string} 前缀
   */
  getLevelPrefix(level) {
    const prefixes = {
      error: chalk.red('❌'),
      warn: chalk.yellow('⚠️'),
      info: chalk.blue('ℹ️'),
      success: chalk.green('✅'),
      debug: chalk.gray('🐛')
    }
    
    return prefixes[level] || ''
  }

  /**
   * 检查是否应该输出该级别的日志
   * @param {string} level - 日志级别
   * @returns {boolean} 是否输出
   */
  shouldLog(level) {
    if (this.silent) return false
    
    const levels = { debug: 0, info: 1, warn: 2, error: 3 }
    const currentLevel = levels[this.level] || 1
    const logLevel = levels[level] || 1
    
    return logLevel >= currentLevel
  }

  /**
   * 输出日志
   * @param {string} level - 日志级别
   * @param {string} message - 消息
   * @param {*} args - 其他参数
   */
  log(level, message, ...args) {
    if (!this.shouldLog(level)) return
    
    const formattedMessage = this.formatMessage(level, message, ...args)
    console.log(formattedMessage)
  }

  /**
   * 错误日志
   * @param {string} message - 消息
   * @param {*} args - 其他参数
   */
  error(message, ...args) {
    this.log('error', message, ...args)
  }

  /**
   * 警告日志
   * @param {string} message - 消息
   * @param {*} args - 其他参数
   */
  warn(message, ...args) {
    this.log('warn', message, ...args)
  }

  /**
   * 信息日志
   * @param {string} message - 消息
   * @param {*} args - 其他参数
   */
  info(message, ...args) {
    this.log('info', message, ...args)
  }

  /**
   * 成功日志
   * @param {string} message - 消息
   * @param {*} args - 其他参数
   */
  success(message, ...args) {
    this.log('success', message, ...args)
  }

  /**
   * 调试日志
   * @param {string} message - 消息
   * @param {*} args - 其他参数
   */
  debug(message, ...args) {
    this.log('debug', message, ...args)
  }

  /**
   * 进度日志
   * @param {string} message - 消息
   * @param {*} args - 其他参数
   */
  progress(message, ...args) {
    this.log('info', `📍 ${message}`, ...args)
  }

  /**
   * 开始任务日志
   * @param {string} taskName - 任务名称
   */
  startTask(taskName) {
    this.info(`🚀 开始: ${taskName}`)
  }

  /**
   * 完成任务日志
   * @param {string} taskName - 任务名称
   */
  completeTask(taskName) {
    this.success(`✅ 完成: ${taskName}`)
  }

  /**
   * 失败任务日志
   * @param {string} taskName - 任务名称
   * @param {Error} error - 错误对象
   */
  failTask(taskName, error) {
    this.error(`❌ 失败: ${taskName}`, error.message)
  }

  /**
   * 格式化对象
   * @param {*} obj - 要格式化的对象
   * @returns {string} 格式化的字符串
   */
  formatObject(obj) {
    return JSON.stringify(obj, null, 2)
  }

  /**
   * 分隔线
   */
  separator() {
    console.log(chalk.gray('─'.repeat(50)))
  }

  /**
   * 空行
   */
  newline() {
    console.log()
  }

  /**
   * 设置日志级别
   * @param {string} level - 新级别
   */
  setLevel(level) {
    this.level = level
  }

  /**
   * 启用/禁用静默模式
   * @param {boolean} silent - 是否静默
   */
  setSilent(silent) {
    this.silent = silent
  }

  /**
   * 启用/禁用时间戳
   * @param {boolean} timestamp - 是否显示时间戳
   */
  setTimestamp(timestamp) {
    this.timestamp = timestamp
  }
}

// 创建全局logger实例
const logger = new Logger()

module.exports = logger