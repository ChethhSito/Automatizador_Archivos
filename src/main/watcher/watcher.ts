import * as chokidar from 'chokidar'
import { EventEmitter } from 'events'
import path from 'path'

export class WatcherEngine extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null
  private pathsToWatch: string[] = []

  constructor(paths: string[] = []) {
    super()
    this.pathsToWatch = paths
  }

  /**
   * Add a path to be watched
   */
  public addPath(targetPath: string): void {
    if (!this.pathsToWatch.includes(targetPath)) {
      this.pathsToWatch.push(targetPath)
      if (this.watcher) {
        this.watcher.add(targetPath)
      }
    }
  }

  /**
   * Remove a path from being watched
   */
  public removePath(targetPath: string): void {
    this.pathsToWatch = this.pathsToWatch.filter((p) => p !== targetPath)
    if (this.watcher) {
      this.watcher.unwatch(targetPath)
    }
  }

  /**
   * Start watching folders
   */
  public start(): void {
    if (this.watcher) {
      this.stop()
    }

    if (this.pathsToWatch.length === 0) {
      console.warn('[WatcherEngine] No paths registered to watch.')
      return
    }

    console.log(`[WatcherEngine] Starting watcher for paths: ${this.pathsToWatch.join(', ')}`)

    this.watcher = chokidar.watch(this.pathsToWatch, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true, // Only trigger on new files, not existing files on startup
      depth: 0 // Deepest sub-level to traverse. Limit to 0 (root folder only) for basic watcher
    })

    this.watcher
      .on('add', (filePath) => {
        console.log(`[WatcherEngine] File detected: ${filePath}`)
        const resolvedPath = path.resolve(filePath)
        this.emit('file-added', resolvedPath)
      })
      .on('error', (error) => {
        console.error(`[WatcherEngine] Watcher error: ${error}`)
        this.emit('error', error)
      })
  }

  /**
   * Stop watching folders
   */
  public stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
      console.log('[WatcherEngine] Stopped watching paths.')
    }
  }

  /**
   * Get list of currently watched paths
   */
  public getWatchedPaths(): string[] {
    return [...this.pathsToWatch]
  }
}
