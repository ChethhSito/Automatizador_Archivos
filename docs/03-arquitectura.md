# 03 - Arquitectura Detallada de Módulos

Este documento detalla los componentes lógicos que conforman la arquitectura de **DownloadSentry (SortFlow Desk)**, sus responsabilidades y cómo interactúan de forma segura.

---

## 📦 Módulo: WatcherEngine

* **Ruta de código:** `src/main/watcher/watcher.ts`
* **Dependencias:** `chokidar`, `events` (EventEmitter)

El `WatcherEngine` es una clase TypeScript que extiende del módulo de eventos nativo de Node.js (`EventEmitter`). Su única responsabilidad es mantener una sesión activa de monitoreo sobre directorios físicos:

* **Evita bloqueos:** Configurado de manera 100% asíncrona y reactiva.
* **Ignora dotfiles:** Una expresión regular (`/(^|[\/\\])\../`) previene el análisis de archivos temporales ocultos del sistema.
* **Profundidad Cero (`depth: 0`):** Para evitar bucles infinitos, no vigila de forma recursiva subcarpetas internas (como las de organización), enfocándose exclusivamente en la raíz de descargas.

---

## 📦 Módulo: RulesEngine

* **Ruta de código:** `src/main/rules/rules.ts`
* **Dependencias:** `fs-extra`, `electron` (app)

El `RulesEngine` representa el núcleo de reglas de negocio del dominio:

* **Mapeador de Dominio:** Asigna extensiones a carpetas lógicas:
  * `.pdf`, `.docx`, `.txt` -> `Organized/Documents`
  * `.jpg`, `.png`, `.svg` -> `Organized/Images`
  * `.mp3`, `.mp4` -> `Organized/Media`
  * `.zip`, `.rar` -> `Organized/Archives`
  * `.exe`, `.msi` -> `Organized/Installers_Temp` (Zona Temporal)
* **Colisiones de Nombre:** Si ya existe un archivo con el mismo nombre en el destino, le concatena una estampa de tiempo (`Date.now()`) para preservar ambos archivos.
* **Manejo de Errores Robustos:** Encapsula las operaciones en bloques `try/catch` capturando específicamente códigos de error de Windows como `EPERM` o `EACCES` (falta de permisos en el archivo) y retornando una explicación amigable al usuario.

### ⏳ Algoritmo de Retención de Instaladores:
1. Al mover un instalador, se escribe un registro JSON en el directorio `userData` del usuario (`downloadsentry_temp_installers.json`).
2. El registro guarda el nombre original, la ruta actual y un timestamp de expiración establecido en: `Date.now() + 7 días`.
3. Un proceso periódico evalúa las expiraciones, remueve físicamente el archivo si el plazo culminó, y limpia la base de datos JSON.

---

## 📦 Módulo: IpcBridge (Seguridad de Procesos)

* **Rutas de código:** `src/preload/index.ts` y `src/main/ipc/handlers.ts`
* **Responsabilidad:** Puente seguro de IPC con Context Isolation.

El proceso Renderer (React) no puede importar librerías de Node.js por motivos de seguridad corporativa. La comunicación se realiza de forma estrictamente tipada:

* **Preload Script:** Expone métodos ultraespecíficos (`api.startWatcher`, `api.getRules`, `api.purgeInstallers`) y controladores de eventos tipados (`onFileAdded`, `onFileOrganized`). No expone accesos directos al canal IPC genérico.
* **IPC Handlers:** En el proceso principal, inicializa los motores, reacciona a los eventos del `WatcherEngine`, ejecuta las reglas a través de `RulesEngine` y notifica en tiempo real los resultados de regreso a la interfaz gráfica.
