/**
 * PackageManager - 包管理器抽象类
 * 
 * 提供统一的包管理接口：
 * 1. 支持npm/yarn/pnpm等包管理器
 * 2. 统一的安装、卸载、升级接口
 * 3. 版本锁定和缓存管理
 * 4. 镜像源配置支持
 * 5. 并发安装优化
 * 
 * 开发指南：
 * - 使用抽象工厂模式支持多种包管理器
 * - 实现版本锁定机制
 * - 提供详细的进度反馈
 * - 支持断点续传和重试机制
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs-extra')
const os = require('os')

// 导入工具模块
const logger = require('./logger')

class PackageManager {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    this.context = options.context || process.cwd()
    this.packageManager = options.packageManager || 'npm'
    this.registry = options.registry || 'https://registry.npmjs.org/'
    this.concurrent = options.concurrent || 4
    this.retryTimes = options.retryTimes || 3
    
    // 包管理器特定配置
    this.managerConfig = this.getManagerConfig()
    
    logger.debug('PackageManager initialized', { 
      packageManager: this.packageManager,
      registry: this.registry 
    })
  }

  /**
   * 获取包管理器配置
   * @returns {Object} 配置对象
   */
  getManagerConfig() {
    const configs = {
      npm: {
        command: 'npm',
        install: ['install'],
        installDev: ['install', '--save-dev'],
        uninstall: ['uninstall'],
        update: ['update'],
        lockFile: 'package-lock.json',
        commandArgs: {
          install: ['--registry', this.registry],
          installDev: ['--save-dev', '--registry', this.registry],
          global: ['--global'],
          production: ['--production'],
          force: ['--force'],
          optional: ['--optional'],
          noOptional: ['--no-optional'],
          dryRun: ['--dry-run']
        }
      },
      yarn: {
        command: 'yarn',
        install: [],
        installDev: ['add', '--dev'],
        uninstall: ['remove'],
        update: ['upgrade'],
        lockFile: 'yarn.lock',
        commandArgs: {
          install: [`--registry=${this.registry}`],
          installDev: ['--dev', `--registry=${this.registry}`],
          global: ['global'],
          production: ['--production'],
          force: ['--force'],
          optional: ['--optional'],
          noOptional: ['--ignore-optional'],
          dryRun: ['--dry-run']
        }
      },
      pnpm: {
        command: 'pnpm',
        install: ['install'],
        installDev: ['add', '--save-dev'],
        uninstall: ['remove'],
        update: ['update'],
        lockFile: 'pnpm-lock.yaml',
        commandArgs: {
          install: ['--registry', this.registry],
          installDev: ['--save-dev', '--registry', this.registry],
          global: ['--global'],
          production: ['--production'],
          force: ['--force'],
          optional: ['--optional'],
          noOptional: ['--no-optional'],
          dryRun: ['--dry-run']
        }
      }
    }

    return configs[this.packageManager] || configs.npm
  }

  /**
   * 安装依赖
   * @param {Array} packages - 包名数组
   * @param {Object} options - 选项
   * @returns {Promise<void>}
   */
  async install(packages = [], options = {}) {
    try {
      logger.startTask('安装依赖')

      const { dev = false, global = false, production = false, force = false } = options

      if (packages.length === 0) {
        // 安装所有依赖
        await this.installAll(options)
      } else {
        // 安装指定包
        await this.installPackages(packages, { dev, global, force })
      }

      logger.completeTask('安装依赖')
    } catch (error) {
      logger.failTask('安装依赖', error)
      throw error
    }
  }

  /**
   * 安装所有依赖
   * @param {Object} options - 选项
   * @returns {Promise<void>}
   */
  async installAll(options = {}) {
    const { production = false, force = false } = options
    
    const args = [
      ...this.managerConfig.install,
      ...this.getCommandArgs({ production, force })
    ]

    await this.runCommand(this.managerConfig.command, args, {
      cwd: this.context,
      stdio: 'inherit'
    })
  }

  /**
   * 安装指定包
   * @param {Array} packages - 包名数组
   * @param {Object} options - 选项
   * @returns {Promise<void>}
   */
  async installPackages(packages, options = {}) {
    const { dev = false, global = false, force = false } = options
    
    const args = [
      ...(dev ? this.managerConfig.installDev : this.managerConfig.install),
      ...packages,
      ...this.getCommandArgs({ global, force })
    ]

    await this.runCommand(this.managerConfig.command, args, {
      cwd: this.context,
      stdio: 'inherit'
    })
  }

  /**
   * 卸载包
   * @param {Array} packages - 包名数组
   * @param {Object} options - 选项
   * @returns {Promise<void>}
   */
  async uninstall(packages, options = {}) {
    try {
      logger.startTask(`卸载包: ${packages.join(', ')}`)

      const args = [
        ...this.managerConfig.uninstall,
        ...packages
      ]

      await this.runCommand(this.managerConfig.command, args, {
        cwd: this.context,
        stdio: 'inherit'
      })

      logger.completeTask('卸载包')
    } catch (error) {
      logger.failTask('卸载包', error)
      throw error
    }
  }

  /**
   * 升级包
   * @param {Array} packages - 包名数组（空数组表示升级所有）
   * @param {Object} options - 选项
   * @returns {Promise<void>}
   */
  async update(packages = [], options = {}) {
    try {
      const packageList = packages.length > 0 ? packages.join(', ') : '所有包'
      logger.startTask(`升级包: ${packageList}`)

      const args = packages.length > 0 
        ? [...this.managerConfig.update, ...packages]
        : [...this.managerConfig.update]

      await this.runCommand(this.managerConfig.command, args, {
        cwd: this.context,
        stdio: 'inherit'
      })

      logger.completeTask('升级包')
    } catch (error) {
      logger.failTask('升级包', error)
      throw error
    }
  }

  /**
   * 获取已安装包信息
   * @param {string} packageName - 包名（可选）
   * @returns {Promise<Object>} 包信息
   */
  async getInstalledPackages(packageName = null) {
    try {
      let args
      let output

      if (packageName) {
        args = this.packageManager === 'yarn' 
          ? ['list', packageName, '--depth=0', '--json']
          : ['list', packageName, '--depth=0', '--json']
      } else {
        args = this.packageManager === 'yarn'
          ? ['list', '--depth=0', '--json']
          : ['list', '--depth=0', '--json']
      }

      output = await this.runCommand(this.managerConfig.command, args, {
        cwd: this.context,
        capture: true
      })

      return this.parsePackageList(output)
    } catch (error) {
      logger.warn('获取已安装包信息失败:', error.message)
      return {}
    }
  }

  /**
   * 检查包是否有更新
   * @param {string} packageName - 包名
   * @returns {Promise<Object>} 更新信息
   */
  async checkForUpdates(packageName) {
    try {
      const args = ['outdated', packageName, '--json']
      
      const output = await this.runCommand(this.managerConfig.command, args, {
        cwd: this.context,
        capture: true
      })

      return this.parseOutdatedOutput(output)
    } catch (error) {
      // outdated命令可能在某些情况下失败，返回空结果
      return {}
    }
  }

  /**
   * 清理缓存
   * @returns {Promise<void>}
   */
  async cleanCache() {
    try {
      logger.startTask('清理缓存')

      const args = this.packageManager === 'yarn' 
        ? ['cache', 'clean']
        : ['cache', 'clean']

      await this.runCommand(this.managerConfig.command, args, {
        cwd: this.context,
        stdio: 'inherit'
      })

      logger.completeTask('清理缓存')
    } catch (error) {
      logger.failTask('清理缓存', error)
      throw error
    }
  }

  /**
   * 验证锁文件
   * @returns {Promise<boolean>} 是否有效
   */
  async validateLockFile() {
    const lockFilePath = path.join(this.context, this.managerConfig.lockFile)
    
    if (!(await fs.pathExists(lockFilePath))) {
      return false
    }

    try {
      const args = ['install', '--dry-run']
      await this.runCommand(this.managerConfig.command, args, {
        cwd: this.context,
        capture: true
      })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 生成锁文件
   * @returns {Promise<void>}
   */
  async generateLockFile() {
    try {
      logger.startTask('生成锁文件')

      const args = ['install']
      await this.runCommand(this.managerConfig.command, args, {
        cwd: this.context,
        stdio: 'inherit'
      })

      logger.completeTask('生成锁文件')
    } catch (error) {
      logger.failTask('生成锁文件', error)
      throw error
    }
  }

  /**
   * 查找可执行文件路径
   * @param {string} command - 命令名
   * @returns {string|null} 可执行文件路径
   */
  findExecutable(command) {
    // 如果是完整路径，直接返回
    if (path.isAbsolute(command)) {
      return command
    }

    // 从环境变量PATH中查找
    const pathEnv = process.env.PATH || process.env.Path || ''
    const pathSeparator = os.platform() === 'win32' ? ';' : ':'
    
    const paths = pathEnv.split(pathSeparator)
    
    for (const dir of paths) {
      if (!dir) continue
      
      const executablePath = path.join(dir, command)
      const executablePathWithExt = os.platform() === 'win32' 
        ? path.join(dir, `${command}.cmd`) 
        : executablePath
      
      // 检查带扩展名的版本（Windows）
      if (os.platform() === 'win32') {
        if (fs.existsSync(executablePathWithExt)) {
          return executablePathWithExt
        }
      }
      
      // 检查不带扩展名的版本
      if (fs.existsSync(executablePath)) {
        try {
          // 检查文件是否可执行
          fs.accessSync(executablePath, fs.constants.X_OK)
          return executablePath
        } catch (err) {
          // 文件存在但不可执行，继续查找
          continue
        }
      }
    }

    // 如果在PATH中找不到，尝试常见的安装路径（Windows）
    if (os.platform() === 'win32') {
      const commonPaths = [
        'C:\\Program Files\\nodejs\\npm.cmd',
        'C:\\Program Files (x86)\\nodejs\\npm.cmd',
        path.join(process.env.APPDATA || '', 'npm', 'npm.cmd')
      ]
      
      for (const npmPath of commonPaths) {
        if (fs.existsSync(npmPath)) {
          return npmPath
        }
      }
    }

    return null
  }

  /**
   * 运行包管理器命令
   * @param {string} command - 命令
   * @param {Array} args - 参数
   * @param {Object} options - 选项
   * @returns {Promise<string>} 命令输出
   */
  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const { capture = false } = options
      
      // 查找可执行文件路径
      const executablePath = this.findExecutable(command)
      
      if (!executablePath) {
        const errorMsg = `找不到可执行文件: ${command}。请确保${command}已正确安装并在PATH环境变量中。`
        logger.error(errorMsg)
        reject(new Error(errorMsg))
        return
      }
      
      logger.debug(`使用可执行文件: ${executablePath}`)
      logger.debug(`运行命令: ${command} ${args.join(' ')}`)
      logger.debug(`工作目录: ${options.cwd || this.context}`)
      
      // 确保PATH环境变量可用并处理Windows路径
      const spawnOptions = {
        stdio: capture ? 'pipe' : 'inherit',
        env: {
          ...process.env,
          PATH: process.env.PATH
        },
        shell: os.platform() === 'win32', // 在Windows上使用shell
        ...options
      }
      
      // Windows下如果使用.cmd文件，需要通过shell调用
      const finalCommand = os.platform() === 'win32' && executablePath.endsWith('.cmd') 
        ? executablePath 
        : command
        
      const finalArgs = os.platform() === 'win32' && executablePath.endsWith('.cmd')
        ? args // .cmd文件会处理自己的参数
        : args
      
      const child = spawn(finalCommand, finalArgs, spawnOptions)

      let output = ''
      let error = ''

      if (capture) {
        child.stdout.on('data', (data) => {
          output += data.toString()
        })

        child.stderr.on('data', (data) => {
          error += data.toString()
        })
      }

      child.on('close', (code) => {
        logger.debug(`命令完成: ${command}, 退出码: ${code}`)
        if (code === 0) {
          resolve(output.trim())
        } else {
          reject(new Error(`命令执行失败 (${code}): ${error || output}`))
        }
      })

      child.on('error', (err) => {
        logger.error(`命令启动失败: ${command}`, err)
        reject(new Error(`命令启动失败: ${err.message}`))
      })
    })
  }

  /**
   * 获取命令参数
   * @param {Object} options - 选项
   * @returns {Array} 参数数组
   */
  getCommandArgs(options = {}) {
    const args = []
    
    Object.keys(options).forEach(key => {
      if (options[key] && this.managerConfig.commandArgs[key]) {
        args.push(...this.managerConfig.commandArgs[key])
      }
    })

    return args
  }

  /**
   * 解析包列表输出
   * @param {string} output - 命令输出
   * @returns {Object} 解析结果
   */
  parsePackageList(output) {
    try {
      const data = JSON.parse(output)
      return data.data ? data.data.dependencies || {} : {}
    } catch (error) {
      logger.warn('解析包列表失败:', error.message)
      return {}
    }
  }

  /**
   * 解析过期包输出
   * @param {string} output - 命令输出
   * @returns {Object} 解析结果
   */
  parseOutdatedOutput(output) {
    try {
      return JSON.parse(output)
    } catch (error) {
      return {}
    }
  }

  /**
   * 获取包管理器信息
   * @returns {Object} 包管理器信息
   */
  getManagerInfo() {
    return {
      name: this.packageManager,
      version: this.getManagerVersion(),
      lockFile: this.managerConfig.lockFile,
      registry: this.registry
    }
  }

  /**
   * 获取包管理器版本
   * @returns {string} 版本号
   */
  async getManagerVersion() {
    try {
      const output = await this.runCommand(this.managerConfig.command, ['--version'])
      return output.trim()
    } catch (error) {
      return 'unknown'
    }
  }
}

module.exports = PackageManager