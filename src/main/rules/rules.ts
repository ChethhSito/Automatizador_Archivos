import fs from 'fs-extra'
import path from 'path'
import { app } from 'electron'

export interface Rule {
  id: string
  name: string
  extensions: string[]
  targetDir: string
  isInstallerRule?: boolean
}

export interface RuleExecutionResult {
  success: boolean
  filePath: string
  destPath?: string
  ruleName?: string
  error?: string
}

export interface TempFileMetadata {
  originalName: string
  movedPath: string
  addedAt: number // timestamp
  expiresAt: number // timestamp
}

export class RulesEngine {
  private rules: Rule[] = []
  private baseDir: string
  private tempInstallersZone: string
  private metadataPath: string

  constructor(baseDir: string = '') {
    // Default baseDir is User's downloads or documents path if not provided
    this.baseDir = baseDir || app.getPath('downloads')
    this.tempInstallersZone = path.join(this.baseDir, 'Organized', 'Installers_Temp')
    this.metadataPath = path.join(
      app.getPath('userData'),
      'downloadsentry_temp_installers.json'
    )

    this.loadDefaultRules()
  }

  /**
   * Load standard default sorting rules
   */
  private loadDefaultRules(): void {
    const organizedRoot = path.join(this.baseDir, 'Organized')

    this.rules = [
      {
        id: 'docs',
        name: 'Documents',
        extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.rtf'],
        targetDir: path.join(organizedRoot, 'Documents')
      },
      {
        id: 'images',
        name: 'Images',
        extensions: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff'],
        targetDir: path.join(organizedRoot, 'Images')
      },
      {
        id: 'media',
        name: 'Audio & Video',
        extensions: ['.mp3', '.wav', '.mp4', '.mkv', '.avi', '.mov', '.flac', '.ogg'],
        targetDir: path.join(organizedRoot, 'Media')
      },
      {
        id: 'archives',
        name: 'Archives & Compressed',
        extensions: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
        targetDir: path.join(organizedRoot, 'Archives')
      },
      {
        id: 'installers',
        name: 'Installers (Auto-delete in 7 Days)',
        extensions: ['.exe', '.msi', '.dmg', '.pkg'],
        targetDir: this.tempInstallersZone,
        isInstallerRule: true
      }
    ]
  }

  /**
   * Set custom rules
   */
  public setRules(rules: Rule[]): void {
    this.rules = rules
  }

  /**
   * Get all registered rules
   */
  public getRules(): Rule[] {
    return [...this.rules]
  }

  /**
   * Apply rule logic on a given file path
   */
  public async executeRule(filePath: string): Promise<RuleExecutionResult> {
    try {
      // 1. Ensure file exists and is not a directory
      const exists = await fs.pathExists(filePath)
      if (!exists) {
        return { success: false, filePath, error: 'File does not exist' }
      }

      const stat = await fs.stat(filePath)
      if (stat.isDirectory()) {
        return { success: false, filePath, error: 'Target is a directory, not a file' }
      }

      const ext = path.extname(filePath).toLowerCase()
      const fileName = path.basename(filePath)

      // 2. Find matching rule
      const matchingRule = this.rules.find((rule) => rule.extensions.includes(ext))

      if (!matchingRule) {
        return { success: false, filePath, error: 'No matching rule found for this file type' }
      }

      // Ensure target directory exists
      await fs.ensureDir(matchingRule.targetDir)

      const destPath = path.join(matchingRule.targetDir, fileName)

      // 3. Prevent overwriting identical file names by appending a timestamp or index
      let finalDestPath = destPath
      if (await fs.pathExists(finalDestPath)) {
        const fileExt = path.extname(fileName)
        const baseName = path.basename(fileName, fileExt)
        finalDestPath = path.join(
          matchingRule.targetDir,
          `${baseName}_${Date.now()}${fileExt}`
        )
      }

      // 4. Move file asynchronously
      console.log(`[RulesEngine] Moving ${filePath} -> ${finalDestPath}`)
      await fs.move(filePath, finalDestPath)

      // 5. If it's an installer, log its deletion metadata
      if (matchingRule.isInstallerRule) {
        await this.registerTempInstaller(fileName, finalDestPath)
      }

      return {
        success: true,
        filePath,
        destPath: finalDestPath,
        ruleName: matchingRule.name
      }
    } catch (err: any) {
      console.error(`[RulesEngine] Failed to organize file ${filePath}:`, err)
      
      // Capture system specific error codes (EPERM, EACCES)
      let friendlyError = err.message || 'Unknown I/O error'
      if (err.code === 'EPERM' || err.code === 'EACCES') {
        friendlyError = `Permission denied (EPERM/EACCES). Please check system permissions or file locks.`
      }

      return {
        success: false,
        filePath,
        error: friendlyError
      }
    }
  }

  /**
   * Register a newly moved installer in the auto-delete database
   */
  private async registerTempInstaller(originalName: string, movedPath: string): Promise<void> {
    try {
      let metadataList: TempFileMetadata[] = []
      
      if (await fs.pathExists(this.metadataPath)) {
        metadataList = await fs.readJson(this.metadataPath)
      }

      const now = Date.now()
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      
      const newMeta: TempFileMetadata = {
        originalName,
        movedPath,
        addedAt: now,
        expiresAt: now + sevenDaysMs
      }

      metadataList.push(newMeta)
      await fs.writeJson(this.metadataPath, metadataList, { spaces: 2 })
      console.log(`[RulesEngine] Installer registered for automatic deletion on: ${new Date(newMeta.expiresAt).toLocaleDateString()}`)
    } catch (error) {
      console.error('[RulesEngine] Failed to write installer metadata:', error)
    }
  }

  /**
   * Scans and deletes installers that have exceeded their 7-day retention
   */
  public async purgeExpiredInstallers(): Promise<{ purgedCount: number; errorsCount: number }> {
    console.log('[RulesEngine] Running expired installers purge check...')
    let purgedCount = 0
    let errorsCount = 0

    try {
      if (!(await fs.pathExists(this.metadataPath))) {
        return { purgedCount, errorsCount }
      }

      const metadataList: TempFileMetadata[] = await fs.readJson(this.metadataPath)
      const now = Date.now()
      const remainingList: TempFileMetadata[] = []

      for (const item of metadataList) {
        if (now >= item.expiresAt) {
          try {
            if (await fs.pathExists(item.movedPath)) {
              await fs.remove(item.movedPath)
              console.log(`[RulesEngine] Purged expired installer: ${item.movedPath}`)
              purgedCount++
            } else {
              // File already deleted manually, we can just remove it from meta list
              purgedCount++
            }
          } catch (err) {
            console.error(`[RulesEngine] Error deleting expired file ${item.movedPath}:`, err)
            errorsCount++
            remainingList.push(item) // keep in list to retry next time
          }
        } else {
          remainingList.push(item)
        }
      }

      await fs.writeJson(this.metadataPath, remainingList, { spaces: 2 })
    } catch (error) {
      console.error('[RulesEngine] Purge check encountered an error:', error)
    }

    return { purgedCount, errorsCount }
  }

  /**
   * Get active tracking list of temporary installers
   */
  public async getTempInstallers(): Promise<TempFileMetadata[]> {
    try {
      if (await fs.pathExists(this.metadataPath)) {
        return await fs.readJson(this.metadataPath)
      }
    } catch (error) {
      console.error('[RulesEngine] Failed to read installer metadata:', error)
    }
    return []
  }
}
