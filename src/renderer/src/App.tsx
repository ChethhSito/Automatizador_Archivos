import React, { useEffect, useState } from 'react'
import { FileOrganizedResult, TempInstaller } from '../../preload/index'

function App(): React.JSX.Element {
  const [watchedPaths, setWatchedPaths] = useState<string[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [tempInstallers, setTempInstallers] = useState<TempInstaller[]>([])
  const [logs, setLogs] = useState<FileOrganizedResult[]>([])
  const [isWatcherActive, setIsWatcherActive] = useState<boolean>(true)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [customPath, setCustomPath] = useState<string>('')
  const [statusMessage, setStatusMessage] = useState<string>('Sistema activo y monitoreando.')

  // Cargar datos iniciales y configurar escuchadores de eventos IPC
  useEffect(() => {
    fetchInitialData()

    const unsubscribeFileAdded = window.api.onFileAdded((filePath) => {
      setStatusMessage(`Nuevo archivo detectado: ${filePath.split('\\').pop()}`)
    })

    const unsubscribeFileOrganized = window.api.onFileOrganized((result) => {
      setLogs((prevLogs) => [result, ...prevLogs.slice(0, 49)]) // Capacidad máx de 50 registros
      setStatusMessage(
        result.success 
          ? `Organizado con éxito: ${result.filePath.split('\\').pop()}`
          : `Error al organizar: ${result.error}`
      )
      if (result.ruleName?.includes('Installer') || result.ruleName?.includes('Instaladores')) {
        refreshTempInstallers()
      }
    })

    const unsubscribeWatcherError = window.api.onWatcherError((error) => {
      setStatusMessage(`Error del monitor: ${error}`)
    })

    return () => {
      unsubscribeFileAdded()
      unsubscribeFileOrganized()
      unsubscribeWatcherError()
    }
  }, [])

  const fetchInitialData = async (): Promise<void> => {
    try {
      const paths = await window.api.getWatchedPaths()
      setWatchedPaths(paths)

      const activeRules = await window.api.getRules()
      setRules(activeRules)

      const installers = await window.api.getTempInstallers()
      setTempInstallers(installers)
    } catch (err) {
      console.error('Error al cargar datos iniciales:', err)
      setStatusMessage('Fallo al inicializar algunas configuraciones clave.')
    }
  }

  const refreshTempInstallers = async (): Promise<void> => {
    const installers = await window.api.getTempInstallers()
    setTempInstallers(installers)
  }

  const handleToggleWatcher = async (): Promise<void> => {
    try {
      if (isWatcherActive) {
        await window.api.stopWatcher()
        setIsWatcherActive(false)
        setStatusMessage('Monitoreo detenido.')
      } else {
        await window.api.startWatcher(watchedPaths)
        setIsWatcherActive(true)
        setStatusMessage('Monitoreo iniciado.')
      }
    } catch (err: any) {
      setStatusMessage(`Error al cambiar el estado del monitor: ${err.message}`)
    }
  }

  const handleManualSort = async (): Promise<void> => {
    if (watchedPaths.length === 0) return
    setIsProcessing(true)
    setStatusMessage('Ejecutando organización manual...')

    try {
      const targetDir = watchedPaths[0]
      const results = await window.api.executeManualSort(targetDir)
      
      const successCount = results.filter((r) => r.success).length
      setStatusMessage(`Organización manual completada. Se organizaron ${successCount} de ${results.length} archivos.`)
      refreshTempInstallers()
    } catch (err: any) {
      setStatusMessage(`Fallo en la organización manual: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePurgeInstallers = async (): Promise<void> => {
    setIsProcessing(true)
    setStatusMessage('Purgando instaladores expirados...')
    try {
      const res = await window.api.purgeInstallers()
      setStatusMessage(`Purga completa. Eliminados ${res.purgedCount} instalador(es) expirado(s). Errores: ${res.errorsCount}`)
      refreshTempInstallers()
    } catch (err: any) {
      setStatusMessage(`Error en la purga: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAddWatchPath = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!customPath.trim()) return

    const newPaths = [...watchedPaths, customPath.trim()]
    try {
      await window.api.startWatcher(newPaths)
      setWatchedPaths(newPaths)
      setIsWatcherActive(true)
      setCustomPath('')
      setStatusMessage(`Carpeta agregada para vigilar: ${customPath}`)
    } catch (err: any) {
      setStatusMessage(`Fallo al agregar carpeta: ${err.message}`)
    }
  }

  const formatTimeRemaining = (expiresAt: number): string => {
    const diffMs = expiresAt - Date.now()
    if (diffMs <= 0) return 'Expirado'
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    if (days > 0) {
      return `${days}d ${hours}h restantes`
    }
    return `${hours}h restantes`
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col w-full selection:bg-violet-500 selection:text-white">
      {/* Header Responsivo */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-200 bg-clip-text text-transparent">
                DownloadSentry
              </h1>
              <p className="text-xs text-slate-400">SortFlow Desk • Organizador de Archivos Domain-Driven</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:self-center">
            {/* Indicador de Estado */}
            <div className="flex items-center space-x-2 bg-slate-850 border border-slate-800 rounded-full px-3 sm:px-4 py-1.5 text-xs">
              <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${isWatcherActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="font-semibold uppercase tracking-wider text-slate-300">
                {isWatcherActive ? 'Monitoreo Activo' : 'Monitoreo Detenido'}
              </span>
            </div>

            {/* Acciones Rápidas */}
            <button
              onClick={handleToggleWatcher}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 cursor-pointer ${
                isWatcherActive
                  ? 'border-rose-900/50 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300'
                  : 'border-emerald-900/50 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-300'
              }`}
            >
              {isWatcherActive ? 'Detener' : 'Iniciar'}
            </button>

            <button
              onClick={handleManualSort}
              disabled={isProcessing || watchedPaths.length === 0}
              className="bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-550 disabled:opacity-40 disabled:pointer-events-none text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all duration-200 cursor-pointer"
            >
              {isProcessing ? 'Procesando...' : 'Organizar Ahora'}
            </button>
          </div>
        </div>
      </header>

      {/* Grid de Contenido Responsivo */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 w-full">
        {/* Columna Izquierda: Carpetas y Reglas (1/3 en pantallas medianas+) */}
        <section className="md:col-span-1 flex flex-col space-y-6">
          {/* Directorios Vigilados */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm flex flex-col space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-violet-400">Directorios Vigilados</h3>
            
            <div className="space-y-2">
              {watchedPaths.length > 0 ? (
                watchedPaths.map((p, idx) => (
                  <div key={idx} className="bg-slate-950/60 border border-slate-850 rounded-xl px-3 sm:px-4 py-3 flex items-center justify-between text-xs sm:text-sm gap-2">
                    <span className="font-mono text-slate-300 truncate flex-1 break-all" title={p}>
                      {p}
                    </span>
                    <span className="text-[9px] sm:text-[10px] bg-violet-950/40 border border-violet-900/40 text-violet-300 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                      Principal
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs sm:text-sm text-slate-500 italic">No hay carpetas registradas.</p>
              )}
            </div>

            {/* Agregar Ruta */}
            <form onSubmit={handleAddWatchPath} className="mt-2 flex space-x-2">
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="Ruta (ej: C:\Descargas)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500 placeholder-slate-650 min-w-0"
              />
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex-shrink-0 cursor-pointer"
              >
                Añadir
              </button>
            </form>
          </div>

          {/* Reglas de Organización */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm flex flex-col space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-violet-400">Reglas de Organización</h3>
            
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="bg-slate-950/40 border border-slate-850 rounded-xl p-3 flex flex-col space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200 truncate">{rule.name}</span>
                    {rule.isInstallerRule && (
                      <span className="text-[9px] bg-amber-950/40 border border-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full font-semibold uppercase flex-shrink-0">
                        Temp 7d
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {rule.extensions.map((ext) => (
                      <span key={ext} className="font-mono text-[9px] sm:text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                        {ext}
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate" title={rule.targetDir}>
                    Destino: <span className="font-mono text-slate-400">{rule.targetDir.split('\\').slice(-2).join('\\')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Columna Derecha: Zona de Instaladores e Historial (2/3 en pantallas medianas+) */}
        <section className="md:col-span-2 flex flex-col space-y-6">
          {/* Zona de Instaladores Temporales */}
          <div className="bg-gradient-to-br from-slate-900/60 to-slate-950 border border-slate-800/80 rounded-2xl p-5 sm:p-6 backdrop-blur-sm relative overflow-hidden flex flex-col">
            <div className="absolute right-0 top-0 w-32 h-32 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center space-x-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-amber-400">Zona de Retención Temporal</h3>
              </div>

              <button
                onClick={handlePurgeInstallers}
                disabled={isProcessing || tempInstallers.length === 0}
                className="bg-amber-950/20 border border-amber-900/50 hover:bg-amber-950/40 text-amber-300 disabled:opacity-40 disabled:pointer-events-none px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 sm:self-center cursor-pointer"
              >
                Escanear y Purgar Expirados
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Los instaladores (.exe, .msi, .dmg, .pkg) se mueven automáticamente a un directorio temporal y se programan para su eliminación permanente después de 7 días, liberando espacio en disco y evitando el desorden.
            </p>

            {tempInstallers.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-850/50 rounded-xl p-3 bg-slate-950/25">
                {tempInstallers.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/70 border border-slate-850/80 rounded-lg p-2.5 flex items-center justify-between text-xs gap-3">
                    <div className="flex flex-col space-y-0.5 overflow-hidden flex-1 min-w-0">
                      <span className="font-semibold text-slate-300 truncate" title={item.originalName}>
                        {item.originalName}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate" title={item.movedPath}>
                        Ruta: {item.movedPath.split('\\').slice(-3).join('\\')}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-amber-300/90 whitespace-nowrap bg-amber-950/30 border border-amber-900/30 px-2 py-0.5 rounded flex-shrink-0">
                      {formatTimeRemaining(item.expiresAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-slate-800 rounded-xl p-6 text-center text-xs text-slate-500">
                La zona temporal está vacía en este momento.
              </div>
            )}
          </div>

          {/* Panel de Historial de Actividad */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm flex-1 flex flex-col space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-violet-400">Historial de Actividad</h3>
            
            <div className="flex-1 overflow-y-auto max-h-[360px] space-y-2 pr-1">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className={`border rounded-xl p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      log.success 
                        ? 'border-emerald-950/30 bg-emerald-950/10'
                        : 'border-rose-950/30 bg-rose-950/10'
                    }`}
                  >
                    <div className="flex flex-col space-y-1 overflow-hidden flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className={`font-bold ${log.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {log.success ? 'ORGANIZADO CON ÉXITO' : 'FALLÓ LA ORGANIZACIÓN'}
                        </span>
                        {log.ruleName && (
                          <span className="text-[9px] bg-slate-800 border border-slate-700 text-slate-350 px-1.5 py-0.5 rounded font-medium">
                            {log.ruleName}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-slate-300 truncate break-all block" title={log.filePath}>
                        Origen: {log.filePath.split('\\').pop()}
                      </span>
                      {log.destPath && (
                        <span className="text-[10px] text-slate-400 truncate break-all block" title={log.destPath}>
                          Destino: {log.destPath}
                        </span>
                      )}
                      {log.error && (
                        <span className="text-[10px] text-rose-300/80 font-medium break-words">
                          Detalle: {log.error}
                        </span>
                      )}
                    </div>

                    <span className="text-[9px] text-slate-500 whitespace-nowrap self-end sm:self-center flex-shrink-0">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-500 p-8 border border-dashed border-slate-800 rounded-xl">
                  <svg className="w-8 h-8 text-slate-700 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Aún no hay eventos registrados en este ciclo. El monitor está activo.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Barra de Estado inferior */}
      <footer className="border-t border-slate-850/80 bg-slate-950/60 px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-slate-500 mt-auto gap-4">
        <span className="truncate">{statusMessage}</span>
        <span className="flex-shrink-0">Versión 1.0.0</span>
      </footer>
    </div>
  )
}

export default App
