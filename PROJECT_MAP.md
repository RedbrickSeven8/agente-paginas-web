# PROJECT MAP - STUDIO AGENT CLIENT (APPLE-CENTRIC AI WORKSPACE)

## Arquitectura del Sistema (Mermaid Graph)

```mermaid
graph TD
    User([Usuario Global: Dani • Multi-dispositivo: Mac, iPad, iPhone, Android, PC]) --> WebApp[Studio Agent WebApp]
    
    subgraph UI_UX [UI / UX Apple-Centric & Mobile-First]
        Nav[Dynamic Island, Sync Status Bar & Navigation Bar]
        ZenToggle[Zen Mode / Mobile Sidebar Sheet Toggle]
        Sidebar[Barra Lateral: Proyectos, Carpetas, Chats Aislados con Renombrado/Edición, Tags & Pins]
        ChatArea[Área de Conversación con Smart Auto-Scroll, SSE Streaming Ininterrumpido & Live Step Timeline]
        LiveStepCard[Acciones en Vivo Expandibles & Orden Cronológico Inverso: Última Arriba]
        InputDock[Smart Input: Paste Clipboard Images/Docs, Slash / Commands, Attachment Dock & Prompts]
        StopControl[Control de Detención Inmediata & Cancelación de SSE Stream]
        CanvasRight[Side View: Iframe Live Preview, Multi-Device & Diff Slider]
        Debugger[Floating Debugger: Logs de Consola y API Dify]
        CmdModal[Modal Gestor CRUD Completo de Comandos y Atajos con Eliminación Funcional]
        PromptModal[Modal Gestor CRUD Completo de Biblioteca de Prompts con Eliminación Funcional]
        SearchModal[Modal Búsqueda Global con Botón de Cierre & Esc]
        ExportModal[Descarga de Carpetas ZIP y Exportación de Workspace]
        FileViewerModal[Modal Visor Universal Multimodal: Imágenes, PDF, Código, Video, Audio & Docs]
    end

    subgraph Core_Engine [Motor de Lógica Frontend & Persistencia]
        Store[Local Storage & State Engine Reactivo - state.js: Aislamiento de Memoria por Chat, CRUD Chats, Commands, Prompts]
        CloudSync[Cloud Sync Engine Event-Driven con Protección Anti-Interrupción en Background - sync.js]
        DifyClient[Dify SSE Client con Normalización Universal de Archivos / MIME (.jpeg, .jpg, .png, etc.) - dify.js]
        SlashHandler[Slash / Autocomplete & In-Place Cursor Inserter]
        FileEngine[Client Compressor, Paste, Previews & Multi-upload Resilient Manager con Normalización MIME]
        CanvasEngine[Live Device Frame & Code Previewer - canvas.js]
        ExportEngine[Folder & Project Zip Exporter - JSZip]
    end

    subgraph Remote_Services [Servicios Remotos]
        DifyAPI[Dify API v1: /chat-messages con Conversation ID & User ID Aislados, /files/upload con MIME Validado]
        SupabaseStorage[Supabase Cloud Bucket: /storage/v1/object/agent-files/workspaces/]
        SupabaseDB[Supabase PostgreSQL DB: /rest/v1/workspaces]
        GistCloudDB[GitHub Cloud Storage API: /gists Fallback Store]
    end

    WebApp --> Nav
    WebApp --> Sidebar
    WebApp --> ChatArea
    WebApp --> LiveStepCard
    WebApp --> StopControl
    WebApp --> InputDock
    WebApp --> CanvasRight
    WebApp --> Debugger
    WebApp --> CmdModal
    WebApp --> PromptModal
    WebApp --> SearchModal
    WebApp --> ExportModal
    WebApp --> FileViewerModal

    InputDock --> SlashHandler
    InputDock --> FileEngine
    ChatArea --> DifyClient
    DifyClient <-->|SSE Stream / HTTPS Aislado| DifyAPI
    StopControl -->|Abort Controller & Reset UI| DifyClient
    DifyClient -->|Pausa de Sincronización mientras actúa| CloudSync
    Store <--> CloudSync
    CloudSync <-->|Storage Bucket Sync JSON| SupabaseStorage
    CloudSync <-->|REST API JSON| SupabaseDB
    CloudSync <-->|JSON Gist REST Sync| GistCloudDB
    FileEngine -->|Upload Resiliente con MIME Exacto| DifyAPI
    Store <--> WebApp
    ExportEngine <--> Store
```

## Componentes y Módulos
1. **Compatibilidad Universal de Archivos e Imágenes (`js/app.js`, `js/dify.js`):** Soporte total y normalización de todos los formatos de archivo e imágenes (`.jpeg`, `.jpg`, `.png`, `.webp`, `.gif`, `.svg`, `.bmp`, `.ico`, `.avif`, `.heic`, `.pdf`, `.txt`, `.md`, `.json`, etc.). Mapeo estricto de tipos MIME y resolución de `image/jpeg` frente a cadenas vacías o `application/octet-stream`, evitando errores de validación en los modelos multimodales y la API de Dify.
2. **Manejo Robusto y Resiliente de Archivos Adjuntos (`js/app.js`, `js/dify.js`):** Soporte completo para subida y visualización de imágenes (capturas de pantalla, pegado de portapapeles), PDFs, código y documentos con previsualización inmediata en local y validación estricta de IDs de subida antes de enviar a Dify.
3. **Aislamiento Total de Contexto y Memoria entre Chats (`js/dify.js`, `js/state.js`):** Cada conversación posee su propio identificador de conversación (`difyConversationId`) y contexto aislado (`user: ${userId}_${chatId}` y metadatos de proyecto/carpeta en `inputs`), evitando que los mensajes de diferentes carpetas o proyectos se mezclen en un solo hilo.
4. **Ejecución Continua en Segundo Plano e Inmunidad al Cambio de Pestaña / Ventana (`js/app.js`, `js/dify.js`, `js/sync.js`):** El procesamiento por Fetch Streams continúa de manera fluida aunque el usuario cambie de pestaña, minimice el navegador o abra otra aplicación; la escucha de eventos de almacenamiento (`storage`) y observadores de estado no interrumpen la renderización activa del stream.
5. **Visor Universal de Archivos Multimodal (`js/app.js`, `index.html`):** Modal interactivo para visualizar imágenes en alta resolución, PDF, código, audio, video y documentos adjuntos.
6. **Acciones en Vivo con Orden Inverso y Vista Ampliada:** La última acción se posiciona arriba y permite ver detalles y logos ampliados.
7. **Control de Detención Inmediata:** Botón de detener reactivo con cancelación instantánea de tareas y streams.
