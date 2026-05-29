# MASTER DOCUMENT: DOWNLOADSENTRY (O SORTFLOW DESK)
<!-- Optimized Context Document for LLM indexing. Do not alter manually. -->

> This specification aggregates all global metadata, strict architectural boundaries, and AI system behaviors for DownloadSentry (o SortFlow Desk).

## 🛠️ Stack Configuration & Architecture Map

| Domain | Architecture Profile |
| :--- | :--- |
| **Project Name** | DownloadSentry (o SortFlow Desk) |
| **System Pattern** | Clean Architecture (Domain-Driven Design) |
| **Technology Stack** | React, TypeScript, Node.js, Electron, Chokidar, fs-extra, Tailwind CSS |

## 🧩 Modules Isolation & Business Boundaries

These guidelines describe strict directory and logical boundaries within this repository:

### 📦 Module: WatcherEngine
- **Authorized Directory Paths**: `src/main/watcher/`
- **Critical Business Logic**: Inicializa y maneja la instancia de Chokidar para vigilar carpetas (como "Descargas"). Emite eventos asíncronos cuando se crean nuevos archivos y los envía de forma segura al motor de reglas.

### 📦 Module: RulesEngine
- **Authorized Directory Paths**: `src/main/rules/`
- **Critical Business Logic**: Mapea tipos de archivos (MIME/Extensiones) y ejecuta la lógica de organización usando fs-extra. Lógica crítica: los instaladores (.exe, .dmg, .pkg) deben moverse a una zona temporal con metadatos de eliminación automática tras 7 días.

### 📦 Module: IpcBridge
- **Authorized Directory Paths**: `src/preload.ts, src/main/ipc/`
- **Critical Business Logic**: Define los canales IPC seguros a través de contextBridge. Protege la app: el Renderer (React) no puede importar directamente 'fs' o 'child_process' debido a directivas estrictas de seguridad (Context Isolation).

### 📦 Module: UiRenderer
- **Authorized Directory Paths**: `src/renderer/`
- **Critical Business Logic**: Frontend en React para gestionar visualmente las reglas activas, configurar rutas objetivo, ver logs de archivos movidos recientemente y forzar ejecuciones manuales del organizador.

## 🧭 AI Behavioral Directives

Apply these directives globally when executing code edits in this workspace:

- **Minimize Token Waste**: Write direct diffs. Do not rewrite unmodified sections of files.
- **Zero Redundant Explanations**: Omit conversational summaries, salutations, or explanations of what was edited.
- **Strict Type Adherence**: Type safety must be fully declared without shortcuts or broad generalizations.

### Custom Domain Constraints:
- - Arquitectura Electron Estricta: Código del Main Process (Node.js) nunca debe importarse directamente en el Renderer Process (React). Toda comunicación se realiza por IPC asíncrono.
- - Gestión I/O Asíncrona: Utilizar métodos asíncronos de 'fs-extra' (ej: fs.move, fs.ensureDir) para evitar bloquear el hilo de ejecución principal y mantener el rendimiento del monitor de archivos.
- - Control de Errores Robustos: Cada acción de mover o borrar archivos debe estar envuelta en bloques try/catch que registren fallas de permisos de Windows (EPERM, EACCES) y notifiquen al usuario a través del puente IPC.
