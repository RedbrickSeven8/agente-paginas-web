# ESPECIFICACIÓN TÉCNICA Y REQUERIMIENTOS: STUDIO AGENT CLIENT

## 1. MÓDULO BASE Y CONEXIÓN API (DIFY)
- **API Endpoint:** `https://api.dify.ai/v1`
- **Bearer Token / API Key:** `app-CSpN9ANweE2UjmdYvMqjURaF`
- **Estado Inicial del Espacio de Trabajo:** Totalmente limpio/vacío (sin proyectos ni chats por defecto).
- **Rendimiento:** Conexión vía Server-Sent Events (SSE) para renderizado en *streaming* con efecto de escritura en tiempo real e indicadores visuales de las herramientas internas del agente (ej. *"Ejecutando herramienta..."*, *"Buscando recursos..."*).

---

## 2. ARQUITECTURA DE DATOS, PROYECTOS Y CONTEXTO
- **Persistencia y Sincronización Multiplataforma:** Identificador unificado (`user_id` persistente) para sincronizar historial, carpetas y configuraciones entre iPhone, iPad y macOS.
- **Estructura Jerárquica:**
  - **Proyectos:** Contenedores principales.
  - **Carpetas y Subcarpetas:** Organización interna por cliente o fase.
  - **Conversaciones Sueltas:** Opción de crear chats directamente dentro de un proyecto pero fuera de cualquier carpeta, o chats totalmente independientes.
- **Contexto Compartido de Proyecto:** El agente debe mantener el contexto acumulado de todas las conversaciones pertenecientes a un mismo proyecto (las conversaciones dentro del proyecto 1 deben tratarse conceptualmente como continuidad de un mismo entorno de trabajo).
- **Gestión CRUD Completa:** Habilidad para renombrar, reorganizar y eliminar proyectos, carpetas y chats en cualquier momento.
- **Etiquetado, Fijado y Archivado:**
  - Sistema de tags personalizados (ej. `#DiseñoWeb`, `#Bugs`, `#PromptDraft`).
  - Anclaje (*Pin*) de chats importantes en la barra lateral y sección de archivo para ocultar proyectos finalizados.

---

## 3. INTERFAZ Y EXPERIENCIA DE USUARIO (APPLE-CENTRIC UI/UX)
- **Diseño Nativo:** Estética Apple con efectos de cristal (*Glassmorphism*), soporte para modo oscuro profundo (*OLED True Black*) y tipografías responsivas.
- **Soporte Táctil y Multitarea:** Adaptado a pantallas de iPhone y iPad (soporte nativo para *Split View* y *Stage Manager*).
- **Panel Lateral Operativo:** Atajo de teclado/botón para ocultar/mostrar la barra lateral (*Zen Mode*).
- **Indicador Dynamic Island / Menú Mac:** Micro-indicador de estado en la parte superior para seguimiento de ejecuciones en segundo plano.
- **Atajos de Teclado:**
  - `Cmd + K`: Abrir búsqueda global.
  - `Cmd + Enter`: Enviar mensaje.
  - Integración mediante esquemas de URL con la app *Atajos de Apple*.

---

## 4. ÁREA DE CHAT, INPUT E INTERCEPTOR DE COMANDOS (`/`)
- **Gestión de Cuadro de Entrada (Chat Input):**
  - **Corrección de comportamiento de adjuntos:** Al adjuntar cualquier archivo, **NUNCA** se debe borrar el texto que el usuario ya haya escrito en la caja de entrada.
- **Comandos Slash (`/`) en Tiempo Real:**
  - Al escribir el carácter `/`, despliega un menú flotante sobre el cursor con los comandos disponibles.
  - Al seleccionar o presionar *Enter*, inserta el comando en la **posición actual del cursor**, manteniendo el resto del texto introducido.
  - **Barra de Accesos Rápidos:** Botones superiores sobre el input con las recomendaciones/últimos comandos usados.
  - **Gestor CRUD de Comandos:** Botón ⚙️ para crear, editar o eliminar comandos de la lista personalizada.
  - **Comandos Predeterminados:**
    - `/editalasimagenes`: Edición de estilo, fondo y estética de imágenes adjuntas.
    - `/crealasimagenes`: Generación de todas las imágenes del sitio web desde cero.
    - `/combinalasimagenes`: Fusión de imágenes del usuario con recursos generados por IA.
    - `/variaspaginas`: Creación de estructura de sitio web multipágina con menú interconectado.
    - `/landing`: Consolidación de contenido en una sola Landing Page.
    - `/creartextos`: Redacción de copy y textos comerciales desde cero.
- **Atajos directos a herramientas (*Tool Shortcuts*):** Interceptación de comandos en el cliente para disparar tareas específicas directamente sin saturar el contexto base del LLM.
- **Galería de Plantillas de Prompts:** Biblioteca flotante para guardar, editar, eliminar e insertar frases o prompts estándar con 1-clic.
- **Acciones sobre Mensajes:** Botones inmediatos para reintentar la última respuesta (*Retry*), detener la generación (*Stop*) o editar un mensaje ya enviado.

---

## 5. MANEJO MULTIMODAL, ARCHIVOS Y ASSETS
- **Carga Masiva:** Drag & Drop de múltiples archivos simultáneos (PDF, MD, DOCX, imágenes, código, etc.) o selección por botón de adjuntar.
- **Pre-visualización de Adjuntos:** *Attachment Dock* flotante sobre la caja de input para ver miniaturas, nombres y eliminar adjuntos antes de enviar.
- **Optimización de Recursos:** Compresión automática de imágenes pesadas en el cliente previo a la subida.
- **Acceso a Entorno de Archivos del Agente:** Panel dedicado para consultar, explorar y descargar directamente las imágenes o archivos generados por Dify.

---

## 6. CANVAS LATERAL (*SIDE-BY-SIDE VIEW*) Y RENDERIZADO (CLAUDE-STYLE)
- **Apertura de Enlaces y Artefactos:** Todos los links externos o vistas previas generadas se abren en un panel lateral independiente a la derecha del chat.
- **Visualizador e Inspector Responsive:**
  - Vista previa de código HTML/JS/CSS mediante `iframe`.
  - Toggle de resolución rápida: **Desktop (1920px)**, **Tablet (768px)** y **Mobile (375px)**.
- **Comparador Visual (Image / Web Diff):** Slider interactivo "Antes y Después" para evaluar cambios entre versiones de diseño o assets multimedia.
- **Renderizado de Código:** Bloques con sintaxis coloreada, numeración de líneas y botón de copia en 1-clic.

---

## 7. BÚSQUEDA, MONITORIZACIÓN Y EXPORTACIÓN
- **Búsqueda Global Filtrada:** Filtros combinables por fecha, tipo de archivo adjunto, carpeta o palabra clave dentro del contenido de los chats.
- **Panel de Logs y Seguimiento de Errores (Floating Debugger):** Ventana flotante e independiente que muestra logs en tiempo real divididos por:
  - Errores de cliente / interfaz.
  - Errores de API de Dify (respuestas truncadas, fallos HTTP, tiempos de espera).
- **Contador de Tokens (Token Counter):** Indicador visual en tiempo real de consumo de tokens acumulados vs. límite de la ventana de contexto.
- **Módulo de Exportación:**
  - Exportación de chats individuales a Markdown (`.md`), PDF y JSON.
  - Exportación masiva de carpetas y proyectos completos empaquetados en archivos `.zip`.