import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Expose a highly specific, secure API subset rather than generic IPC methods
const api = {
  // Watcher Engine Controls
  startWatcher: (paths: string[]): Promise<void> => 
    ipcRenderer.invoke('watcher:start', paths),
    
  stopWatcher: (): Promise<void> => 
    ipcRenderer.invoke('watcher:stop'),
    
  getWatchedPaths: (): Promise<string[]> => 
    ipcRenderer.invoke('watcher:get-paths'),

  // Rules Engine Controls
  getRules: (): Promise<any[]> => 
    ipcRenderer.invoke('rules:get'),
    
  setRules: (rules: any[]): Promise<void> => 
    ipcRenderer.invoke('rules:set', rules),
    
  executeManualSort: (dirPath: string): Promise<any[]> => 
    ipcRenderer.invoke('rules:execute-manual', dirPath),

  // Installer retention
  getTempInstallers: (): Promise<any[]> => 
    ipcRenderer.invoke('installers:get-temp'),
    
  purgeInstallers: (): Promise<{ purgedCount: number; errorsCount: number }> => 
    ipcRenderer.invoke('installers:purge'),

  // Safe event listeners from Main process
  onFileAdded: (callback: (filePath: string) => void) => {
    const subscription = (_event: any, filePath: string): void => callback(filePath)
    ipcRenderer.on('watcher:file-added', subscription)
    return (): void => {
      ipcRenderer.removeListener('watcher:file-added', subscription)
    }
  },

  onFileOrganized: (callback: (result: any) => void) => {
    const subscription = (_event: any, result: any): void => callback(result)
    ipcRenderer.on('rules:file-organized', subscription)
    return (): void => {
      ipcRenderer.removeListener('rules:file-organized', subscription)
    }
  },

  onWatcherError: (callback: (error: string) => void) => {
    const subscription = (_event: any, error: string): void => callback(error)
    ipcRenderer.on('watcher:error', subscription)
    return (): void => {
      ipcRenderer.removeListener('watcher:error', subscription)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('[Preload] Context bridge initialization failed:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

export type API = typeof api
export type FileOrganizedResult = {
  success: boolean
  filePath: string
  destPath?: string
  ruleName?: string
  error?: string
}
export type TempInstaller = {
  originalName: string
  movedPath: string
  addedAt: number
  expiresAt: number
}
