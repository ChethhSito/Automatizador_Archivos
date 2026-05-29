import { ipcMain, BrowserWindow, app } from 'electron'
import fs from 'fs-extra'
import path from 'path'
import { WatcherEngine } from '../watcher/watcher'
import { RulesEngine } from '../rules/rules'

let watcher: WatcherEngine | null = null
let rulesEngine: RulesEngine | null = null
let purgeIntervalId: NodeJS.Timeout | null = null

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // 1. Initialize Engines
  rulesEngine = new RulesEngine()
  
  // Set default watch folder as user's downloads folder directly
  const downloadsPath = app.getPath('downloads')
  watcher = new WatcherEngine([downloadsPath])

  // 2. Setup Watcher Event Forwarding
  watcher.on('file-added', async (filePath) => {
    // Notify frontend that a new file was found
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('watcher:file-added', filePath)
    }

    // Execute Rules Engine on the new file
    if (rulesEngine) {
      const result = await rulesEngine.executeRule(filePath)
      
      // Notify frontend of the sorting result
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('rules:file-organized', result)
      }
    }
  })

  watcher.on('error', (error) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('watcher:error', error?.message || 'Watcher error')
    }
  })

  // Start watcher immediately by default
  watcher.start()

  // Run initial installers purge scan
  rulesEngine.purgeExpiredInstallers().then((res) => {
    console.log(`[IPC Handlers] Initial installers purge scan complete: Purged=${res.purgedCount}, Errors=${res.errorsCount}`)
  })

  // Periodically check and purge expired installers every hour
  purgeIntervalId = setInterval(() => {
    if (rulesEngine) {
      rulesEngine.purgeExpiredInstallers().then((res) => {
        console.log(`[IPC Handlers] Hourly installers purge scan complete: Purged=${res.purgedCount}, Errors=${res.errorsCount}`)
      })
    }
  }, 60 * 60 * 1000)

  // 3. Register IPC Invokables

  // Watcher: Start
  ipcMain.handle('watcher:start', async (_event, paths: string[]) => {
    if (!watcher) return
    watcher.stop()
    
    // Replace paths to watch
    paths.forEach((p) => watcher?.addPath(p))
    watcher.start()
    console.log(`[IPC] Watcher started on paths: ${paths.join(', ')}`)
  })

  // Watcher: Stop
  ipcMain.handle('watcher:stop', async () => {
    if (watcher) {
      watcher.stop()
      console.log('[IPC] Watcher stopped.')
    }
  })

  // Watcher: Get Paths
  ipcMain.handle('watcher:get-paths', async () => {
    return watcher ? watcher.getWatchedPaths() : []
  })

  // Rules: Get
  ipcMain.handle('rules:get', async () => {
    return rulesEngine ? rulesEngine.getRules() : []
  })

  // Rules: Set
  ipcMain.handle('rules:set', async (_event, rules: any[]) => {
    if (rulesEngine) {
      rulesEngine.setRules(rules)
      console.log('[IPC] Custom rules updated.')
    }
  })

  // Rules: Execute Manual Organizer Run
  ipcMain.handle('rules:execute-manual', async (_event, dirPath: string) => {
    console.log(`[IPC] Triggering manual sort scan on directory: ${dirPath}`)
    const results: any[] = []

    if (!rulesEngine) return results

    try {
      if (!(await fs.pathExists(dirPath))) {
        return [{ success: false, filePath: dirPath, error: 'Directory does not exist' }]
      }

      const files = await fs.readdir(dirPath)
      for (const file of files) {
        const fullPath = path.join(dirPath, file)
        const stat = await fs.stat(fullPath)

        if (stat.isFile()) {
          const result = await rulesEngine.executeRule(fullPath)
          results.push(result)
          
          // Forward event to UI for log history update
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('rules:file-organized', result)
          }
        }
      }
    } catch (err: any) {
      console.error(`[IPC] Manual sort execution failed on ${dirPath}:`, err)
      results.push({ success: false, filePath: dirPath, error: err.message })
    }

    return results
  })

  // Installers: Get Temp Installers
  ipcMain.handle('installers:get-temp', async () => {
    return rulesEngine ? rulesEngine.getTempInstallers() : []
  })

  // Installers: Purge Expired
  ipcMain.handle('installers:purge', async () => {
    if (rulesEngine) {
      return await rulesEngine.purgeExpiredInstallers()
    }
    return { purgedCount: 0, errorsCount: 0 }
  })
}

// Cleanup function to clear intervals and stop watchers when closing
export function cleanupIpcHandlers(): void {
  if (watcher) {
    watcher.stop()
    watcher = null
  }
  if (purgeIntervalId) {
    clearInterval(purgeIntervalId)
    purgeIntervalId = null
  }
  console.log('[IPC Handlers] Cleaned up engines.')
}
