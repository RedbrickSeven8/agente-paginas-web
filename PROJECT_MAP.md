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
        CmdModal[Modal Gestor de Comandos & Biblioteca de Prompts]
        SearchModal[Cmd+K Búsqueda Global Filtrada]
        SettingsModal[Configuración de API & User ID Sync]
    end

    subgraph Core_Engine [Motor de Lógica Frontend]
        Store[Local Storage / IndexedDB Sync Engine]
        DifyClient[Dify SSE Client & Token Streamer]
        SlashHandler[Slash Command Interceptor & Auto-completer]
        FileEngine[Client Compressor & Multi-upload Manager]
        ExportEngine[Zip / MD / JSON Exporter]
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

    InputDock --> SlashHandler
    InputDock --> FileEngine
    ChatArea --> DifyClient
    DifyClient <-->|SSE Stream / HTTPS| DifyAPI
    FileEngine -->|Upload| DifyAPI
    Store <--> WebApp
    ExportEngine <--> Store
```

## Componentes y Módulos
1. **Dynamic Island & Header:** Notificaciones fluidas, selector de proyectos, token counter en tiempo real y selector de modo oscuro.
2. **Sidebar:** Estructura jerárquica (Proyectos > Carpetas > Chats), estados anclados (Pinned), tags personalizables (#DiseñoWeb, #Bugs), y archivo.
3. **Chat Feed & SSE Streaming:** Renderizado progresivo tipo Claude/ChatGPT, bloques de código interactivos con syntax highlight y botones de acción (Copiar, Reintentar, Detener, Editar).
4. **Smart Input Dock:** 
   - Autocompletado de comandos slash (`/editalasimagenes`, `/crealasimagenes`, `/combinalasimagenes`, `/variaspaginas`, `/landing`, `/creartextos`).
   - Mantenimiento estricto del texto al adjuntar archivos.
   - Attachment Dock con miniaturas y compresión en cliente.
5. **Canvas Lateral (Artifacts & Side-by-Side View):**
   - Previsualización web responsiva (Desktop 1920px, Tablet 768px, Mobile 375px).
   - Comparador interactivo Antes/Después con slider de división.
   - Navegación de archivos generados y enlaces externos.
6. **Búsqueda Global (Cmd+K) & Filtros:** Por fecha, tipo de archivo, tags y proyectos.
7. **Floating Debugger & Token Monitor:** Seguimiento de peticiones HTTP, SSE chunks, consumo de tokens y errores de API.
8. **Export Engine:** Exportación a JSON, Markdown y empaquetado masivo en ZIP.
