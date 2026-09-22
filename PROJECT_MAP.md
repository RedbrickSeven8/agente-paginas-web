# PROJECT MAP - STUDIO AGENT CLIENT (APPLE-CENTRIC AI WORKSPACE)

## Arquitectura del Sistema (Mermaid Graph)

```mermaid
graph TD
    User([Usuario]) --> WebApp[Studio Agent WebApp]
    
    subgraph UI_UX [UI / UX Apple-Centric Design]
        Nav[Dynamic Island & Navigation Bar]
        ZenToggle[Zen Mode / Sidebar Toggle]
        Sidebar[Barra Lateral: Proyectos, Carpetas, Chats, Tags & Pins]
        ChatArea[Área de Conversación con SSE Streaming]
        InputDock[Smart Input: Slash / Commands, Attachment Dock & Prompts]
        CanvasRight[Canvas Lateral: Iframe Live Preview, Diff Slider & Code]
        Debugger[Floating Debugger: Logs de Consola y API Dify]
        CmdModal[Modal Gestor CRUD de Comandos y Atajos]
        PromptModal[Modal Gestor CRUD de Biblioteca de Prompts]
        SearchModal[Cmd+K Búsqueda Global Filtrada]
        ExportModal[Descarga de Carpetas ZIP y Exportación de Workspace]
        SettingsModal[Configuración de API & User ID Sync]
    end

    subgraph Core_Engine [Motor de Lógica Frontend]
        Store[Local Storage / Sync Engine con CRUD Atajos & Prompts]
        DifyClient[Dify SSE Client & Token Streamer]
        SlashHandler[Slash / Autocomplete & In-Place Cursor Inserter]
        FileEngine[Client Compressor & Multi-upload Manager]
        ExportEngine[Folder & Project Zip Exporter - JSZip]
    end

    subgraph Remote_API [Servicios Remotos]
        DifyAPI[Dify API v1: /chat-messages, /files/upload, /messages]
    end

    WebApp --> Nav
    WebApp --> Sidebar
    WebApp --> ChatArea
    WebApp --> InputDock
    WebApp --> CanvasRight
    WebApp --> Debugger
    WebApp --> CmdModal
    WebApp --> PromptModal
    WebApp --> ExportModal

    InputDock --> SlashHandler
    InputDock --> FileEngine
    ChatArea --> DifyClient
    DifyClient <-->|SSE Stream / HTTPS| DifyAPI
    FileEngine -->|Upload| DifyAPI
    Store <--> WebApp
    ExportEngine <--> Store
```

## Componentes y Módulos
1. **Dynamic Island & Header:** Notificaciones de estado reactivas, contador de tokens y cambio de temas.
2. **Sidebar:** Estructura jerárquica con descarga instantánea individual de carpetas/proyectos en ZIP, anclajes y tags.
3. **Smart Input & Slash Interceptor:**
   - Menú flotante al tipear `/` con filtrado en tiempo real según caracteres subsiguientes.
   - Inserción quirúrgica del comando en la posición exacta del cursor sin borrar el texto existente.
   - Barra de atajos rápidos personalizable con acceso a gestión y edición.
4. **Biblioteca de Prompts y Templates (CRUD Completo):**
   - Modal con creación, edición en vivo y eliminación de templates.
   - Botón "Usar en Chat" para inserción directa en el cursor sin perder texto previo.
5. **Gestor de Atajos y Comandos (CRUD Completo):**
   - Creación y edición de nombres de comando `/...` y descripciones.
6. **Descarga de Carpetas y Proyectos:**
   - Empaquetado instantáneo con JSZip preservando nombres y metadatos JSON.
7. **Canvas Lateral:** Vista previa multi-resolución (Desktop 1920px, Tablet 768px, Mobile 375px), slider Antes/Después y visor de código.
