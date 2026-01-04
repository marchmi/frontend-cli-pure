/**
 * Creator - 项目创建核心类
 * 
 * 负责项目创建的全流程管理：
 * 1. 交互式配置收集
 * 2. 预设处理和验证
 * 3. 项目创建流程编排
 * 4. 事件发射和钩子处理
 * 
 * 开发指南：
 * - 继承EventEmitter实现事件驱动
 * - 使用Promise处理异步流程
 * - 集成inquirer进行交互式配置
 * - 提供完整的错误处理和回滚机制
 */

const EventEmitter = require('events')
const inquirer = require('inquirer')
const path = require('path')
const fs = require('fs-extra')

// 导入工具模块
const logger = require('../utils/logger')
const fileSystem = require('../utils/fileSystem')
const PackageManager = require('../utils/PackageManager')

class Creator extends EventEmitter {
  /**
   * 构造函数
   * @param {string} name - 项目名称
   * @param {string} context - 项目路径
   * @param {Array} promptModules - 提示模块数组
   */
  constructor(name, context, promptModules = []) {
    super()
    
    this.name = name
    this.context = path.resolve(context)
    this.promptModules = promptModules
    
    // 提示配置
    this.injectedPrompts = []
    this.promptCompleteCbs = []
    this.afterInvokeCbs = []
    this.afterAnyInvokeCbs = []
    
    // 状态管理
    this.preset = null
    this.answers = null
    
    logger.debug('Creator initialized', { name, context })
  }

  /**
   * 创建项目主流程
   * @param {Object} cliOptions - 命令行选项
   * @param {Object} preset - 预设配置
   * @returns {Promise<void>}
   */
  async create(cliOptions = {}, preset = null) {
    try {
      this.emit('creation', { event: 'start' })
      logger.info(`🚀 开始创建项目: ${this.name}`)

      // 1. 解析预设配置
      if (!preset) {
        preset = await this.resolvePreset(cliOptions)
      }
      this.preset = preset
      console.log('预设配置:', this.preset)

      // 2. 验证目标目录
      await this.validateTargetDirectory(cliOptions)

      // 3. 初始化项目结构
      await this.initializeProject(cliOptions)

      // 4. 生成项目文件
      await this.generateProjectFiles(cliOptions)

      // 5. 安装依赖
      await this.installDependencies(cliOptions)

      // 6. 执行完成钩子
      await this.runCompletionHooks()

      // 7. Git初始化
      await this.initializeGit(cliOptions)

      this.emit('creation', { event: 'done' })
      logger.success(`✅ 项目创建完成: ${this.name}`)
      
    } catch (error) {
      this.emit('creation', { event: 'error', error })
      logger.error('项目创建失败:', error)
      throw error
    }
  }

  /**
   * 解析预设配置
   * @param {Object} cliOptions - 命令行选项
   * @returns {Promise<Object>} 预设配置
   */
  async resolvePreset(cliOptions) {
    // 优先级：命令行预设 > 内联预设 > 默认预设 > 交互式选择
    if (cliOptions.preset) {
      return await this.loadPreset(cliOptions.preset)
    } else if (cliOptions.inlinePreset) {
      return JSON.parse(cliOptions.inlinePreset)
    } else if (cliOptions.default) {
      return this.getDefaultPreset()
    } else {
      return await this.interactivePresetSelection()
    }
  }

  /**
   * 交互式预设选择
   * @returns {Promise<Object>} 用户选择的预设
   */
  async interactivePresetSelection() {
    // 清屏并显示欢迎信息
    await fileSystem.clearConsole()
    
    logger.info('📋 请选择项目配置：')
    
    // 收集所有可用的预设
    const presets = this.getAvailablePresets()
    
    // 显示预设选择提示
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'preset',
        message: '请选择预设配置:',
        choices: [
          ...Object.keys(presets).map(name => ({
            name: `${name} (${presets[name].description})`,
            value: name
          })),
          { name: '手动配置', value: '__manual__' }
        ]
      }
    ])

    if (answers.preset === '__manual__') {
      return await this.manualConfiguration()
    } else {
      return presets[answers.preset]
    }
  }

  /**
   * 手动配置
   * @returns {Promise<Object>} 手动配置的预设
   */
  async manualConfiguration() {
    const preset = {
      name: 'manual',
      description: '手动配置',
      useConfigFiles: false,
      plugins: {},
      options: {}
    }

    // 收集功能特性选择
    const features = await this.collectFeatureSelections()
    preset.plugins = this.featuresToPlugins(features)

    // 收集其他配置
    const additionalOptions = await this.collectAdditionalOptions()
    Object.assign(preset, additionalOptions)

    return preset
  }

  /**
   * 收集功能特性选择
   * @returns {Promise<Array>} 选中的功能特性
   */
  async collectFeatureSelections() {
    const featureChoices = this.promptModules
      .filter(module => module.type === 'feature')
      .map(module => ({
        name: module.name,
        value: module.value,
        checked: module.checked || false
      }))

    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'features',
        message: '请选择需要的功能特性:',
        choices: featureChoices,
        pageSize: 10
      }
    ])

    return answers.features
  }

  /**
   * 收集其他配置选项
   * @returns {Promise<Object>} 配置选项
   */
  async collectAdditionalOptions() {
    const options = {}

    // 包管理器选择
    const packageManagerChoice = await inquirer.prompt([
      {
        type: 'list',
        name: 'packageManager',
        message: '选择包管理器:',
        choices: [
          { name: 'npm', value: 'npm' },
          { name: 'yarn', value: 'yarn' },
          { name: 'pnpm', value: 'pnpm' }
        ],
        default: 'npm'
      }
    ])

    options.packageManager = packageManagerChoice.packageManager

    return options
  }

  /**
   * 功能特性转换为插件配置
   * @param {Array} features - 功能特性列表
   * @returns {Object} 插件配置
   */
  featuresToPlugins(features) {
    const plugins = {}

    // 默认包含基础插件
    plugins['@frontend-cli/core'] = {}

    // 根据功能特性添加相应插件
    features.forEach(feature => {
      const module = this.promptModules.find(m => m.value === feature)
      if (module && module.plugin) {
        plugins[module.plugin] = module.pluginOptions || {}
      }
    })

    return plugins
  }

  /**
   * 验证目标目录
   * @param {Object} cliOptions - 命令行选项
   * @returns {Promise<void>}
   */
  async validateTargetDirectory(cliOptions) {
    const targetDir = this.context

    if (await fs.pathExists(targetDir)) {
      if (cliOptions.force) {
        logger.info('🗑️  强制覆盖现有目录')
        await fs.remove(targetDir)
      } else if (cliOptions.merge) {
        logger.info('🔄 合并现有目录')
      } else {
        const action = await this.promptDirectoryAction(targetDir)
        if (action === 'cancel') {
          throw new Error('用户取消操作')
        } else if (action === 'overwrite') {
          await fs.remove(targetDir)
        }
      }
    }
  }

  /**
   * 提示目录操作选择
   * @param {string} targetDir - 目标目录
   * @returns {Promise<string>} 用户选择的操作
   */
  async promptDirectoryAction(targetDir) {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: `目标目录 ${targetDir} 已存在，请选择操作:`,
        choices: [
          { name: '覆盖', value: 'overwrite' },
          { name: '合并', value: 'merge' },
          { name: '取消', value: 'cancel' }
        ]
      }
    ])

    return answers.action
  }

  /**
   * 初始化项目结构
   * @param {Object} cliOptions - 命令行选项
   * @returns {Promise<void>}
   */
  async initializeProject(cliOptions) {
    this.emit('creation', { event: 'project-init' })
    logger.info('📁 初始化项目结构')

    // 创建项目目录
    await fs.ensureDir(this.context)

    // 初始化package.json
    await this.initializePackageJson()

    // 保存配置
    await this.saveConfiguration()
  }

  /**
   * 初始化package.json
   * @returns {Promise<void>}
   */
  async initializePackageJson() {
    const pkg = {
      name: this.name,
      version: '0.1.0',
      description: `Frontend project: ${this.name}`,
      private: true,
      scripts: {
        start: 'npm run dev',
        dev: 'webpack serve --mode development',
        build: 'webpack --mode production',
        test: 'jest',
        lint: 'eslint src --ext .js,.jsx,.ts,.tsx'
      },
      devDependencies: {},
      dependencies: {}
    }

    await fileSystem.writeFile(
      path.join(this.context, 'package.json'),
      JSON.stringify(pkg, null, 2)
    )
  }

  /**
   * 保存配置
   * @returns {Promise<void>}
   */
  async saveConfiguration() {
    const configData = {
      preset: this.preset,
      name: this.name,
      created: new Date().toISOString()
    }

    await fileSystem.writeFile(
      path.join(this.context, '.frontendrc.json'),
      JSON.stringify(configData, null, 2)
    )
  }

  /**
   * 安装依赖
   * @param {Object} cliOptions - 命令行选项
   * @returns {Promise<void>}
   */
  async installDependencies(cliOptions) {
    this.emit('creation', { event: 'deps-install' })
    logger.info('📦 安装依赖包')

    const packageManager = new PackageManager({
      context: this.context,
      packageManager: this.preset.options?.packageManager || 'npm'
    })

    await packageManager.install()
  }



  /**
   * 执行完成钩子
   * @returns {Promise<void>}
   */
  async runCompletionHooks() {
    this.emit('creation', { event: 'completion-hooks' })
    logger.info('⚓ 执行完成钩子')

    for (const cb of this.afterInvokeCbs) {
      await cb()
    }

    for (const cb of this.afterAnyInvokeCbs) {
      await cb()
    }
  }

  /**
   * 初始化Git
   * @param {Object} cliOptions - 命令行选项
   * @returns {Promise<void>}
   */
  async initializeGit(cliOptions) {
    if (cliOptions.git === false) {
      return
    }

    this.emit('creation', { event: 'git-init' })
    logger.info('📋 初始化Git仓库')

    try {
      const { execa } = require('await-exec')
      
      await execa('git', ['init'], { cwd: this.context })
      await execa('git', ['add', '.'], { cwd: this.context })
      await execa('git', ['commit', '-m', 'Initial commit'], { cwd: this.context })
      
      logger.success('✅ Git仓库初始化完成')
    } catch (error) {
      logger.warn('⚠️  Git仓库初始化失败:', error.message)
    }
  }

  // ========== 工具方法 ==========

  /**
   * 获取可用的预设列表
   * @returns {Object} 预设对象
   */
  getAvailablePresets() {
    return {
      'Vue基础项目': {
        name: 'vue-basic',
        description: 'Vue3 + JavaScript + ESLint'
      }
    }
  }

  /**
   * 获取默认预设
   * @returns {Object} 默认预设
   */
  getDefaultPreset() {
    return this.getAvailablePresets()['Vue基础项目']
  }

  /**
   * 加载预设
   * @param {string} presetName - 预设名称
   * @returns {Promise<Object>} 预设配置
   */
  async loadPreset(presetName) {
    const presets = this.getAvailablePresets()
    
    if (presets[presetName]) {
      return presets[presetName]
    }

    // 尝试从配置文件加载
    const configPath = path.join(process.cwd(), '.frontendrc.json')
    if (await fs.pathExists(configPath)) {
      const savedPresets = (await fs.readJson(configPath)).presets || {}
      if (savedPresets[presetName]) {
        return savedPresets[presetName]
      }
    }

    throw new Error(`找不到预设: ${presetName}`)
  }
}

module.exports = Creator