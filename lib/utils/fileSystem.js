/**
 * 文件系统工具模块
 * 
 * 提供统一的文件系统操作接口：
 * 1. 安全的文件读写操作
 * 2. 目录结构创建和管理
 * 3. 文件复制和移动
 * 4. 权限检查和处理
 * 5. 路径标准化和解析
 * 
 * 开发指南：
 * - 所有操作都应该异步
 * - 提供完整的错误处理
 * - 支持大文件操作
 * - 保持跨平台兼容性
 */

const fs = require('fs-extra')
const path = require('path')

class FileSystem {
  /**
   * 确保目录存在
   * @param {string} dirPath - 目录路径
   * @returns {Promise<string>} 目录路径
   */
  static async ensureDir(dirPath) {
    await fs.ensureDir(dirPath)
    return path.resolve(dirPath)
  }

  /**
   * 写入文件
   * @param {string} filePath - 文件路径
   * @param {string|Buffer} content - 文件内容
   * @param {Object} options - 写入选项
   * @returns {Promise<void>}
   */
  static async writeFile(filePath, content, options = {}) {
    const { encoding = 'utf8', mode = 0o644 } = options
    
    await fs.ensureDir(path.dirname(filePath))
    await fs.writeFile(filePath, content, { encoding, mode })
  }

  /**
   * 读取文件
   * @param {string} filePath - 文件路径
   * @param {Object} options - 读取选项
   * @returns {Promise<string|Buffer>} 文件内容
   */
  static async readFile(filePath, options = {}) {
    const { encoding = 'utf8' } = options
    return await fs.readFile(filePath, { encoding })
  }

  /**
   * 检查文件是否存在
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>} 是否存在
   */
  static async exists(filePath) {
    return await fs.pathExists(filePath)
  }

  /**
   * 删除文件或目录
   * @param {string} targetPath - 目标路径
   * @returns {Promise<void>}
   */
  static async remove(targetPath) {
    await fs.remove(targetPath)
  }

  /**
   * 复制文件或目录
   * @param {string} src - 源路径
   * @param {string} dest - 目标路径
   * @param {Object} options - 复制选项
   * @returns {Promise<void>}
   */
  static async copy(src, dest, options = {}) {
    const { overwrite = true, errorOnExist = false } = options
    await fs.copy(src, dest, { overwrite, errorOnExist })
  }

  /**
   * 移动文件或目录
   * @param {string} src - 源路径
   * @param {string} dest - 目标路径
   * @param {Object} options - 移动选项
   * @returns {Promise<void>}
   */
  static async move(src, dest, options = {}) {
    const { overwrite = false } = options
    await fs.move(src, dest, { overwrite })
  }

  /**
   * 读取目录
   * @param {string} dirPath - 目录路径
   * @param {Object} options - 读取选项
   * @returns {Promise<Array>} 目录内容列表
   */
  static async readDir(dirPath, options = {}) {
    const { withFileTypes = false } = options
    return await fs.readdir(dirPath, { withFileTypes })
  }

  /**
   * 获取文件信息
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 文件信息
   */
  static async stat(filePath) {
    return await fs.stat(filePath)
  }

  /**
   * 获取文件权限
   * @param {string} filePath - 文件路径
   * @returns {Promise<number>} 权限值
   */
  static async getPermissions(filePath) {
    const stats = await fs.stat(filePath)
    return stats.mode
  }

  /**
   * 设置文件权限
   * @param {string} filePath - 文件路径
   * @param {number} mode - 权限值
   * @returns {Promise<void>}
   */
  static async setPermissions(filePath, mode) {
    await fs.chmod(filePath, mode)
  }

  /**
   * 清屏
   * @returns {Promise<void>}
   */
  static async clearConsole() {
    process.stdout.write('\x1Bc')
  }

  /**
   * 查找文件
   * @param {string} searchPath - 搜索路径
   * @param {string} pattern - 文件名模式
   * @param {Object} options - 搜索选项
   * @returns {Promise<Array>} 匹配的文件列表
   */
  static async findFiles(searchPath, pattern, options = {}) {
    const { recursive = true, ignore = [] } = options
    const files = []
    
    const walkDir = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        // 检查忽略规则
        if (ignore.some(ignorePattern => 
          entry.name.match(new RegExp(ignorePattern)))) {
          continue
        }
        
        if (entry.isDirectory() && recursive) {
          await walkDir(fullPath)
        } else if (entry.isFile() && pattern.test(entry.name)) {
          files.push(fullPath)
        }
      }
    }
    
    await walkDir(searchPath)
    return files
  }

  /**
   * 读取JSON文件
   * @param {string} filePath - JSON文件路径
   * @param {Object} options - 读取选项
   * @returns {Promise<Object>} JSON对象
   */
  static async readJson(filePath, options = {}) {
    const { encoding = 'utf8' } = options
    const content = await fs.readFile(filePath, { encoding })
    return JSON.parse(content)
  }

  /**
   * 写入JSON文件
   * @param {string} filePath - JSON文件路径
   * @param {Object} data - JSON数据
   * @param {Object} options - 写入选项
   * @returns {Promise<void>}
   */
  static async writeJson(filePath, data, options = {}) {
    const { encoding = 'utf8', spaces = 2 } = options
    const content = JSON.stringify(data, null, spaces)
    await this.writeFile(filePath, content, { encoding })
  }

  /**
   * 获取相对路径
   * @param {string} from - 源路径
   * @param {string} to - 目标路径
   * @returns {string} 相对路径
   */
  static getRelativePath(from, to) {
    return path.relative(from, to)
  }

  /**
   * 规范化路径
   * @param {string} filePath - 文件路径
   * @returns {string} 规范化后的路径
   */
  static normalizePath(filePath) {
    return path.normalize(filePath).replace(/\\\\/g, '/')
  }

  /**
   * 解析路径
   * @param {string} filePath - 文件路径
   * @returns {Object} 路径信息
   */
  static parsePath(filePath) {
    const parsed = path.parse(filePath)
    return {
      dir: parsed.dir,
      name: parsed.name,
      ext: parsed.ext,
      base: parsed.base
    }
  }

  /**
   * 创建临时文件
   * @param {string} prefix - 文件前缀
   * @param {string} suffix - 文件后缀
   * @returns {Promise<string>} 临时文件路径
   */
  static async createTempFile(prefix = 'frontend-', suffix = '') {
    const tempDir = await fs.mkdtemp(path.join(require('os').tmpdir(), prefix))
    return path.join(tempDir, `temp${suffix}`)
  }

  /**
   * 清理临时文件
   * @param {string} tempFilePath - 临时文件路径
   * @returns {Promise<void>}
   */
  static async cleanupTempFile(tempFilePath) {
    if (await this.exists(tempFilePath)) {
      await this.remove(tempFilePath)
    }
  }

  /**
   * 计算文件哈希值
   * @param {string} filePath - 文件路径
   * @param {string} algorithm - 哈希算法
   * @returns {Promise<string>} 哈希值
   */
  static async calculateHash(filePath, algorithm = 'md5') {
    const crypto = require('crypto')
    const fs = require('fs')
    
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm)
      const stream = fs.createReadStream(filePath)
      
      stream.on('data', data => hash.update(data))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }

  /**
   * 批量写入文件
   * @param {Object} files - 文件映射 {path: content}
   * @param {Object} options - 写入选项
   * @returns {Promise<void>}
   */
  static async writeFilesBatch(files, options = {}) {
    const promises = Object.entries(files).map(([filePath, content]) =>
      this.writeFile(filePath, content, options)
    )
    
    await Promise.all(promises)
  }

  /**
   * 批量读取文件
   * @param {Array} filePaths - 文件路径数组
   * @param {Object} options - 读取选项
   * @returns {Promise<Object>} 文件内容映射 {path: content}
   */
  static async readFilesBatch(filePaths, options = {}) {
    const promises = filePaths.map(async (filePath) => {
      try {
        const content = await this.readFile(filePath, options)
        return [filePath, content]
      } catch (error) {
        logger.warn(`读取文件失败: ${filePath}`, error.message)
        return [filePath, null]
      }
    })
    
    const results = await Promise.all(promises)
    return Object.fromEntries(results)
  }

  /**
   * 监听文件变化
   * @param {string} filePath - 文件路径
   * @param {Function} callback - 变化回调
   * @returns {Function} 取消监听函数
   */
  static watchFile(filePath, callback) {
    const watcher = fs.watch(filePath, callback)
    return () => watcher.close()
  }

  /**
   * 监听目录变化
   * @param {string} dirPath - 目录路径
   * @param {Function} callback - 变化回调
   * @param {Object} options - 监听选项
   * @returns {Function} 取消监听函数
   */
  static watchDirectory(dirPath, callback, options = {}) {
    const { persistent = true } = options
    const watcher = fs.watch(dirPath, { persistent }, callback)
    return () => watcher.close()
  }
}

module.exports = FileSystem