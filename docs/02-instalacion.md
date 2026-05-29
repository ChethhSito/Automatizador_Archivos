# 02 - Guía de Instalación y Dependencias

Esta guía detalla los pasos para instalar las dependencias, configurar el entorno y ejecutar o compilar el proyecto **DownloadSentry**.

---

## 🛠️ Requisitos Previos

Asegúrate de tener instalados en tu sistema:
* **Node.js** (Versión 18 o superior recomendada)
* **npm** (Versión 9 o superior)
* **Git** (Para control de versiones)

---

## 📦 Dependencias del Proyecto

El proyecto está estructurado con las siguientes librerías de negocio y desarrollo clave:

### Dependencias de Negocio (`dependencies`):
* **`chokidar`:** Motor de monitoreo de archivos ultrarrápido y de bajo consumo que unifica los eventos de cambios en el sistema operativo.
* **`fs-extra`:** Extensión del módulo nativo `fs` que añade métodos con soporte de Promesas nativas (como `move`, `ensureDir`, `remove`).
* **`@electron-toolkit/preload` & `@electron-toolkit/utils`:** Utilidades corporativas para el control seguro de atajos de teclado y la inicialización de Electron.

### Dependencias de Desarrollo (`devDependencies`):
* **`electron`:** Framework para desplegar la ventana de escritorio.
* **`electron-vite`:** Herramienta de compilación ultrarrápida configurada para dividir los procesos Main, Preload y Renderer con Vite.
* **`tailwindcss` & `@tailwindcss/vite`:** Pila de estilos CSS de alto rendimiento v4 para la construcción del diseño premium.
* **`typescript`:** Tipado estático y robusto para todos los módulos de la aplicación.
* **`eslint` & `prettier`:** Mantenimiento de calidad de código y formateo estandarizado.

---

## ⚡ Comandos de Desarrollo y Construcción

En la raíz del proyecto, puedes utilizar los siguientes scripts de NPM:

### 1. Instalar dependencias:
```bash
npm install
```

### 2. Iniciar en modo desarrollo:
```bash
npm run dev
```
*Inicia el compilador Vite en modo watch y arranca la ventana de Electron en tiempo real.*

### 3. Verificar tipos TypeScript:
```bash
npm run typecheck
```
*Valida la coherencia de tipos en los entornos de Node y Web de forma simultánea.*

### 4. Compilar la aplicación para producción:
```bash
npm run build
```
*Genera los archivos finales optimizados dentro del directorio `/out`.*
