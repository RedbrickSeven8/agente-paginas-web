# PROJECT MAP - STUDIO AGENT CLIENT (APPLE-CENTRIC AI WORKSPACE)

## Estructura de Directorios del Repositorio

```
agente-paginas-web/                     # Carpeta Raíz del Proyecto / Empresa
├── graph.json                          # Único archivo en la raíz del proyecto (Estructura de Nodos)
└── agente-paginas-web-app/             # Carpeta contenedora del sitio web y aplicación
    ├── CNAME                           # Configuración de Dominio Personalizado
    ├── README.md                       # Documentación de la Aplicación
    ├── index.html                      # Interfaz Principal WebApp
    ├── terminos.html                   # Términos y Condiciones Legales
    ├── politica-datos.html             # Política de Tratamiento de Datos / Habeas Data
    ├── cookies.html                    # Política de Cookies y Almacenamiento Local
    ├── assets/                         # Recursos Multimedia e Iconos
    │   ├── icons/                      # Favicons, App Icons, SVG Badges
    │   └── images/                     # Capturas, Mockups, Diagramas de Arquitectura
    ├── css/                            # Estilos y Temas
    │   └── style.css                   # Tailwind v4 / Custom Modern Glassmorphic CSS
    ├── downloads/                      # Documentación y Recursos Descargables
    │   └── WebApp Agente-paginas-web.md
    └── js/                             # Módulos y Lógica JavaScript
        ├── app.js                      # Controlador Principal UI & Event Listeners
        ├── canvas.js                   # Previsualizador en Vivo Side View & Device Frames
        ├── dify.js                     # Cliente SSE Dify & Normalización de Archivos
        ├── state.js                    # Estado Reactivo, Memoria y LocalStorage
        └── sync.js                     # Engine de Sincronización Cloud Supabase / Gist
PROJECT_MAP.md                          # Mapa Global del Proyecto
```

## Arquitectura del Sistema (Mermaid Graph)

```mermaid
graph TD
    User([Usuario Global: Dani • Multi-dispositivo: Mac, iPad, iPhone, Android, PC]) --> WebApp[Studio Agent WebApp]
    
    subgraph Repository_Structure [Estructura de Carpetas & Nodos]
        RootFolder[agente-paginas-web/] --> GraphFile[graph.json]
        RootFolder --> AppFolder[agente-paginas-web-app/]
        AppFolder --> HTMLFiles[Páginas Web HTML / Assets / JS / CSS]
    end

    subgraph UI_UX [UI / UX Apple-Centric & Mobile-First]
        Nav[Dynamic Island, Sync Status Bar & Navigation Bar]
        ZenToggle[Zen Mode / Mobile Sidebar Sheet Toggle]
        Sidebar[Barra Lateral: Proyectos, Carpetas, Chats Aislados, Tags, Pins & Enlaces Legales]
        ChatArea[Área de Conversación con Smart Auto-Scroll, SSE Streaming Ininterrumpido & Live Step Timeline]
        LiveStepCard[Acciones en Vivo Expandibles & Orden Cronológico Inverso: Última Arriba]
        InputDock[Smart Input: Paste Clipboard Images/Docs, Slash / Commands, Attachment Dock & Prompts]
        StopControl[Control de Detención Inmediata & Cancelación de SSE Stream]
        CanvasRight[Side View: Iframe Live Preview, Multi-Device & Diff Slider con Assets Locales]
        Debugger[Floating Debugger: Logs de Consola y API Dify]
        CmdModal[Modal Gestor CRUD Completo de Comandos y Atajos con Eliminación Funcional]
        PromptModal[Modal Gestor CRUD Completo de Biblioteca de Prompts con Eliminación Funcional]
        SearchModal[Modal Búsqueda Global con Botón de Cierre & Esc]
        ExportModal[Descarga de Carpetas ZIP y Exportación de Workspace]
        FileViewerModal[Modal Visor Universal Multimodal: Imágenes, PDF, Código, Video, Audio & Docs]
        LegalModal[Modal Centro Legal & Privacidad]
        CookieBanner[Cookie Consent Banner Glassmórfico de Persistencia Técnica]
    end

    subgraph Legal_Pages [Páginas Legales & Cumplimiento Normativo]
        TerminosPage[Página: terminos.html - Términos y Condiciones]
        PoliticaPage[Página: politica-datos.html - Política de Tratamiento de Datos / Habeas Data]
        CookiesPage[Página: cookies.html - Política de Cookies y Almacenamiento Local]
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
    WebApp --> LegalModal
    WebApp --> CookieBanner

    Sidebar --> TerminosPage
    Sidebar --> PoliticaPage
    Sidebar --> CookiesPage
    CookieBanner --> TerminosPage
    CookieBanner --> PoliticaPage
    CookieBanner --> CookiesPage

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
1. **Estructura Modular de Repositorio:** Organización bajo la norma estricta del proyecto (`agente-paginas-web/graph.json` en la raíz y la aplicación completa alojada en `agente-paginas-web/agente-paginas-web-app/`).
2. **Páginas Legales y Cumplimiento Normativo (`terminos.html`, `politica-datos.html`, `cookies.html`):** Cobertura legal integral con diseño Apple Glassmorphic, cumplimiento de Habeas Data, RGPD y aviso flotante de cookies de almacenamiento técnico.
3. **Assets Visuales e Iconografía Generada (`assets/icons/`, `assets/images/`):** Logo vectorial/PNG squircle en alta resolución, previsualizaciones de interfaz, comparativas visuales Before/After y diagramas de arquitectura web sin dependencias externas.
4. **Compatibilidad Universal de Archivos e Imágenes (`js/app.js`, `js/dify.js`):** Soporte total y normalización de todos los formatos de archivo e imágenes (`.jpeg`, `.jpg`, `.png`, `.webp`, `.gif`, `.svg`, `.bmp`, `.ico`, `.avif`, `.heic`, `.pdf`, `.txt`, `.md`, `.json`, etc.).
5. **Aislamiento Total de Contexto y Memoria entre Chats (`js/dify.js`, `js/state.js`):** Cada conversación posee su propio identificador de conversación (`difyConversationId`) y contexto aislado.
6. **Ejecución Continua en Segundo Plano e Inmunidad al Cambio de Pestaña / Ventana (`js/app.js`, `js/dify.js`, `js/sync.js`):** Procesamiento Fetch Streams ininterrumpido.
7. **Visor Universal de Archivos Multimodal (`js/app.js`, `index.html`):** Modal interactivo para previsualización multimodal.
8. **Sincronización Cloud Supabase / Gist:** Respaldo y persistencia en tiempo real.
