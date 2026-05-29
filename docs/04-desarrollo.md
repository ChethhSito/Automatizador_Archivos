# 04 - Bitácora de Desarrollo y Solución de Bugs

Este documento relata cronológicamente las fases de desarrollo del proyecto **DownloadSentry**, las decisiones técnicas que tomamos y cómo resolvimos los bugs durante la fase de verificación.

---

## 📅 Bitácora del Desarrollo

### Fase 1: Planificación y Diseño Arquitectónico
* Evaluamos la especificación de negocio ([master-docs.md](file:///d:/Automatizer_Download/master-docs.md)).
* Diseñamos los límites de aislamiento de módulos (Clean Architecture) para cumplir con el puente IPC seguro y la restricción de llamadas de I/O asíncronas de Node.js fuera del Renderer.

### Fase 2: Andamiaje y Resguardo de Metadatos
* **Decisión Técnica Crítica:** El andamiaje inicial mediante `@quick-start/create-electron` exigía vaciar el directorio actual. Para preservar el archivo maestro `master-docs.md`, aislamos el andamiaje en una subcarpeta temporal (`temp-init`) y luego trasladamos los archivos limpios de regreso a la raíz del espacio de trabajo.

### Fase 3: Integración de Tailwind CSS v4
* Instalamos Tailwind CSS v4 y su plugin nativo de Vite `@tailwindcss/vite`.
* Esta versión v4 mejora drásticamente los tiempos de compilación al integrarse directamente en el árbol de compilación del bundler de Vite, reduciendo el peso final de los estilos empaquetados.

### Fase 4: Desarrollo de Motores y Puente IPC
* Programamos el `WatcherEngine` usando Chokidar.
* Desarrollamos la lógica del `RulesEngine` en base a promesas asíncronas con `fs-extra` y encapsulado de excepciones de permisos (`EPERM`/`EACCES`).
* Conectamos los procesos mediante `contextBridge` en `src/preload/index.ts` y mapeamos los despachadores en `src/main/ipc/handlers.ts`.
* Rediseñamos el frontend en `App.tsx` con un panel oscuro premium completamente responsivo.

---

## 🐛 Bugs Identificados y Solucionados

Durante las pruebas de verificación, identificamos dos bugs cruciales que fueron corregidos inmediatamente:

### 1. Bug del Directorio de Vigilancia Inicial
* **Causa:** El monitor se inicializó calculando el directorio padre del destino de una regla, resultando en `C:\Users\Inicib\Downloads\Organized` en lugar de la carpeta de descargas del usuario. Debido a esto, los archivos colocados en `Downloads` no eran procesados.
* **Solución:** Reemplazamos la lógica en `handlers.ts` importando `app` de Electron y usando directamente `app.getPath('downloads')`. Ahora el sistema vigila el directorio correcto de inmediato.

### 2. Bug del Bloqueo de Scrolls
* **Causa:** El andamiaje original de Electron venía con estilos restrictivos de centrado y desbordamiento en el archivo `main.css`:
  ```css
  body {
    display: flex;
    overflow: hidden;
  }
  ```
  Esto impedía el scroll vertical y recortaba componentes enteros de la interfaz si el usuario reducía el tamaño de la ventana.
* **Solución:** Modificamos `main.css`, removiendo las propiedades flex del `body` y reemplazando `overflow: hidden;` por `overflow-y: auto;` y `overflow-x: hidden;`. También ajustamos el contenedor `#root` para que fluya de manera flexible. Ahora la ventana genera barras de desplazamiento verticales elegantes si la pantalla es muy pequeña.
