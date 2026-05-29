# 01 - Introducción a DownloadSentry

Bienvenido a la documentación técnica de **DownloadSentry (SortFlow Desk)**. Este proyecto es una solución robusta y moderna para la automatización, clasificación y limpieza inteligente de archivos en entornos de escritorio (como carpetas de "Descargas" saturadas).

---

## 🎯 Propósito del Proyecto

El objetivo de DownloadSentry es monitorear en tiempo real los directorios configurados por el usuario, detectar la adición de nuevos archivos e inmediatamente clasificarlos de acuerdo a su tipo (documentos, imágenes, videos, archivos comprimidos, instaladores, etc.) en carpetas ordenadas.

### 🛡️ Características Clave:
* **Monitoreo Asíncrono en Tiempo Real:** Utiliza el motor Chokidar para vigilar sin bloqueos del hilo principal.
* **Organización Domain-Driven:** Clasificación basada en extensiones hacia rutas objetivo específicas.
* **Zona de Retención Temporal:** Regla estricta para instaladores (`.exe`, `.msi`, `.dmg`, `.pkg`) que los traslada a un espacio temporal para su eliminación definitiva tras un lapso de 7 días.
* **Interfaz Gráfica de Alto Impacto (Premium):** Panel de control en React con diseño oscuro responsivo y estadísticas de actividad en tiempo real.

---

## 🏛️ Patrón de Arquitectura Limpia (DDD)

Para garantizar un código mantenible, extensible y seguro, la aplicación implementa los principios de **Clean Architecture** (Arquitectura Limpia) y diseño guiado por el dominio (DDD):

```
+---------------------------------------------------------+
|                      UI RENDERER                        |
|                        (React)                          |
+---------------------------+-----------------------------+
                            | (IPC Asíncrono Seguro)
+---------------------------v-----------------------------+
|                      IPC BRIDGE                         |
|                 (preload.ts & main/ipc)                 |
+---------------------------+-----------------------------+
                            |
+---------------------------v-----------------------------+
|                     BUSINESS ENGINES                    |
|             (WatcherEngine & RulesEngine)               |
+---------------------------------------------------------+
```

### Límites Estrictos de Módulos:
1. **Aislamiento del Renderizador:** El frontend (React) está completamente aislado de Node.js. No tiene acceso directo a los módulos nativos como `fs` o `child_process` por directivas de seguridad corporativa (Context Isolation).
2. **Puente IPC Tipado:** Toda comunicación se realiza por canales asíncronos tipados a través del objeto expuesto de forma segura mediante `contextBridge` en `src/preload/index.ts`.
3. **Motores de Servicio:** Las reglas de negocio y el monitoreo de I/O corren exclusivamente en el proceso principal de Electron (*Main Process*) de forma asíncrona.
