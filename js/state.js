// State Management for Studio Agent Client
class Store {
  constructor() {
    this.STORAGE_KEY = 'studio_agent_data_v1';
    this.state = this.load();
    this.listeners = [];
    this.debounceTimer = null;
    this.initSync();
  }

  getDefaults() {
    return {
      config: {
        apiUrl: 'https://api.dify.ai/v1',
        apiKey: 'app-CSpN9ANweE2UjmdYvMqjURaF',
        userId: 'studio_user_default',
        theme: 'dark',
        zenMode: false
      },
      projects: [
        {
          id: 'proj_default_1',
          name: 'Agente Páginas Web',
          icon: 'globe',
          createdAt: new Date().toISOString(),
          archived: false
        }
      ],
      folders: [
        {
          id: 'fold_default_1',
          name: 'Páginas & Landings',
          projectId: 'proj_default_1',
          createdAt: new Date().toISOString()
        }
      ],
      chats: [
        {
          id: 'chat_default_1',
          title: 'Diseño Web Responsive & Optimización',
          projectId: 'proj_default_1',
          folderId: 'fold_default_1',
          pinned: true,
          archived: false,
          tags: ['#DiseñoWeb', '#Frontend', '#Mobile'],
          messages: [
            {
              id: 'msg_welcome_1',
              role: 'assistant',
              content: '¡Bienvenido a **Studio Agent**! Tu espacio de trabajo para creación, desarrollo y optimización de páginas web modernas con estética minimalista Apple.\n\nPuedes usar los comandos rápidos como `/landing`, `/variaspaginas`, `/crealasimagenes` o `/creartextos` para comenzar de inmediato.',
              files: [],
              thought: '',
              toolCalls: [],
              steps: [
                {
                  id: 'step_init_1',
                  title: 'Entorno de desarrollo listo',
                  type: 'terminal',
                  detail: 'Workspace sincronizado para móviles, tablets y desktop',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ],
              timestamp: new Date().toISOString()
            }
          ],
          difyConversationId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      activeChatId: 'chat_default_1',
      activeProjectId: 'proj_default_1',
      customCommands: [
        { id: 'cmd_1', name: '/editalasimagenes', desc: 'Edición de estilo, fondo y estética de imágenes adjuntas.', icon: 'wand-2' },
        { id: 'cmd_2', name: '/crealasimagenes', desc: 'Generación de todas las imágenes del sitio web desde cero.', icon: 'image-plus' },
        { id: 'cmd_3', name: '/combinalasimagenes', desc: 'Fusión de imágenes del usuario con recursos generados por IA.', icon: 'layers' },
        { id: 'cmd_4', name: '/variaspaginas', desc: 'Creación de estructura de sitio web multipágina con menú.', icon: 'globe' },
        { id: 'cmd_5', name: '/landing', desc: 'Consolidación de contenido en una sola Landing Page.', icon: 'layout-template' },
        { id: 'cmd_6', name: '/creartextos', desc: 'Redacción de copy y textos comerciales desde cero.', icon: 'file-text' }
      ],
      promptTemplates: [
        { id: 'p1', title: 'Landing Page Minimalista', text: 'Crea una Landing Page moderna y minimalista con estética Apple, tipografía SF Pro, botones sutiles y animación suave con Tailwind CSS.' },
        { id: 'p2', title: 'Estructura E-commerce', text: 'Diseña la estructura de una tienda online de ropa con catálogo responsivo, carrito lateral y checkout ultra fluido.' },
        { id: 'p3', title: 'Dashboard SaaS', text: 'Genera un panel de control con métricas clave, gráficos interactivos, sidebar colapsable y modo oscuro profundo.' },
        { id: 'p4', title: 'Portfolio Creativo', text: 'Crea un portafolio para diseñador gráfico con visualizador de proyectos a pantalla completa y sliders Antes/Después.' }
      ],
      tags: ['#DiseñoWeb', '#Bugs', '#PromptDraft', '#Frontend', '#UIPolish', '#Backend'],
      logs: [],
      tokenUsage: {
        total: 0,
        limit: 128000
      }
    };
  }

  load() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const defaults = this.getDefaults();
        
        // Force unified default user ID if not explicitly set
        const config = { ...defaults.config, ...(parsed.config || {}) };
        if (!config.userId || config.userId.startsWith('user-')) {
          config.userId = 'studio_user_default';
        }

        const stateObj = {
          ...defaults,
          ...parsed,
          config
        };

        // If projects is empty or not an array, initialize with defaults
        if (!Array.isArray(stateObj.projects) || stateObj.projects.length === 0) {
          stateObj.projects = defaults.projects;
          stateObj.folders = defaults.folders;
          if (!stateObj.chats || stateObj.chats.length === 0) {
            stateObj.chats = defaults.chats;
          }
          stateObj.activeProjectId = defaults.activeProjectId;
          stateObj.activeChatId = stateObj.chats[0]?.id || null;
        }

        return stateObj;
      }
    } catch (e) {
      console.error('Error loading state:', e);
    }
    return this.getDefaults();
  }

  save(skipCloudPush = false) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
      this.notify();

      if (!skipCloudPush && window.cloudSyncService) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          window.cloudSyncService.pushState(this.state);
        }, 500);
      }
    } catch (e) {
      console.error('Error saving state:', e);
    }
  }

  initSync() {
    // Immediate pull on load
    const doSync = async () => {
      if (window.cloudSyncService) {
        await window.cloudSyncService.pullState(this.state.config.userId, (remoteData) => {
          this.mergeRemoteData(remoteData);
        });

        window.cloudSyncService.startPolling(
          () => this.state.config.userId,
          (remoteData) => this.mergeRemoteData(remoteData)
        );
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', doSync);
    } else {
      doSync();
    }
  }

  mergeRemoteData(remote) {
    if (!remote || typeof remote !== 'object') return;
    let hasChanges = false;

    // 1. Merge Projects: Remote takes priority if populated, keeping union of both
    if (Array.isArray(remote.projects) && remote.projects.length > 0) {
      const currentProjects = Array.isArray(this.state.projects) ? this.state.projects : [];
      const projectMap = new Map();
      
      // Load current projects
      currentProjects.forEach(p => { if (p && p.id) projectMap.set(p.id, p); });
      // Overlay remote projects
      remote.projects.forEach(rp => {
        if (rp && rp.id) {
          const existing = projectMap.get(rp.id);
          projectMap.set(rp.id, { ...(existing || {}), ...rp });
        }
      });

      const mergedList = Array.from(projectMap.values());
      if (JSON.stringify(this.state.projects) !== JSON.stringify(mergedList)) {
        this.state.projects = mergedList;
        if (!this.state.activeProjectId && mergedList.length > 0) {
          this.state.activeProjectId = mergedList[0].id;
        }
        hasChanges = true;
      }
    }

    // 2. Merge Folders
    if (Array.isArray(remote.folders) && remote.folders.length > 0) {
      const currentFolders = Array.isArray(this.state.folders) ? this.state.folders : [];
      const folderMap = new Map();
      currentFolders.forEach(f => { if (f && f.id) folderMap.set(f.id, f); });
      remote.folders.forEach(rf => {
        if (rf && rf.id) {
          const existing = folderMap.get(rf.id);
          folderMap.set(rf.id, { ...(existing || {}), ...rf });
        }
      });
      const mergedFolders = Array.from(folderMap.values());
      if (JSON.stringify(this.state.folders) !== JSON.stringify(mergedFolders)) {
        this.state.folders = mergedFolders;
        hasChanges = true;
      }
    }

    // 3. Merge Chats & Messages
    if (Array.isArray(remote.chats) && remote.chats.length > 0) {
      const currentChats = Array.isArray(this.state.chats) ? this.state.chats : [];
      const chatMap = new Map();
      currentChats.forEach(c => { if (c && c.id) chatMap.set(c.id, c); });

      remote.chats.forEach(rc => {
        if (rc && rc.id) {
          const local = chatMap.get(rc.id);
          if (local) {
            const localMsgs = Array.isArray(local.messages) ? local.messages : [];
            const remoteMsgs = Array.isArray(rc.messages) ? rc.messages : [];
            const messages = localMsgs.length >= remoteMsgs.length ? localMsgs : remoteMsgs;
            chatMap.set(rc.id, { ...local, ...rc, messages });
          } else {
            chatMap.set(rc.id, rc);
          }
        }
      });

      const mergedChats = Array.from(chatMap.values());
      if (JSON.stringify(this.state.chats) !== JSON.stringify(mergedChats)) {
        this.state.chats = mergedChats;
        if (!this.state.activeChatId && mergedChats.length > 0) {
          this.state.activeChatId = mergedChats[0].id;
        }
        hasChanges = true;
      }
    }

    // 4. Check Commands
    if (Array.isArray(remote.customCommands) && remote.customCommands.length > 0) {
      if (JSON.stringify(this.state.customCommands) !== JSON.stringify(remote.customCommands)) {
        this.state.customCommands = remote.customCommands;
        hasChanges = true;
      }
    }

    // 5. Check Prompts
    if (Array.isArray(remote.promptTemplates) && remote.promptTemplates.length > 0) {
      if (JSON.stringify(this.state.promptTemplates) !== JSON.stringify(remote.promptTemplates)) {
        this.state.promptTemplates = remote.promptTemplates;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
      this.notify();
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this.state));
  }

  // --- Projects CRUD ---
  addProject(name, icon = 'folder') {
    const id = 'proj_' + Date.now();
    const proj = { id, name: name.trim(), icon, createdAt: new Date().toISOString(), archived: false };
    this.state.projects.push(proj);
    this.state.activeProjectId = id;
    this.save();
    return proj;
  }

  updateProject(id, updates) {
    const p = this.state.projects.find(x => x.id === id);
    if (p) {
      Object.assign(p, updates);
      this.save();
    }
  }

  deleteProject(id) {
    this.state.projects = this.state.projects.filter(x => x.id !== id);
    this.state.folders = this.state.folders.filter(x => x.projectId !== id);
    this.state.chats = this.state.chats.filter(x => x.projectId !== id);
    if (this.state.activeProjectId === id) {
      this.state.activeProjectId = this.state.projects.length > 0 ? this.state.projects[0].id : null;
    }
    this.save();
  }

  // --- Folders CRUD ---
  addFolder(name, projectId) {
    const id = 'fold_' + Date.now();
    const folder = { id, name: name.trim(), projectId, createdAt: new Date().toISOString() };
    this.state.folders.push(folder);
    this.save();
    return folder;
  }

  updateFolder(id, updates) {
    const f = this.state.folders.find(x => x.id === id);
    if (f) {
      Object.assign(f, updates);
      this.save();
    }
  }

  deleteFolder(id) {
    this.state.folders = this.state.folders.filter(x => x.id !== id);
    this.state.chats.forEach(c => {
      if (c.folderId === id) c.folderId = null;
    });
    this.save();
  }

  // --- Chats CRUD ---
  addChat({ title = 'Nueva Conversación', projectId = null, folderId = null, tags = [] }) {
    const id = 'chat_' + Date.now();
    const chat = {
      id,
      title: title.trim(),
      projectId,
      folderId,
      pinned: false,
      archived: false,
      tags,
      messages: [],
      difyConversationId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.state.chats.unshift(chat);
    this.state.activeChatId = id;
    this.save();
    return chat;
  }

  updateChat(id, updates) {
    const c = this.state.chats.find(x => x.id === id);
    if (c) {
      Object.assign(c, updates, { updatedAt: new Date().toISOString() });
      this.save();
    }
  }

  deleteChat(id) {
    this.state.chats = this.state.chats.filter(x => x.id !== id);
    if (this.state.activeChatId === id) {
      this.state.activeChatId = this.state.chats.length > 0 ? this.state.chats[0].id : null;
    }
    this.save();
  }

  getActiveChat() {
    return this.state.chats.find(x => x.id === this.state.activeChatId) || null;
  }

  // --- Prompts Templates CRUD ---
  addPrompt(title, text) {
    const id = 'prompt_' + Date.now();
    const newPrompt = { id, title: title.trim(), text: text.trim() };
    this.state.promptTemplates.unshift(newPrompt);
    this.save();
    return newPrompt;
  }

  updatePrompt(id, updates) {
    const p = this.state.promptTemplates.find(x => x.id === id);
    if (p) {
      Object.assign(p, updates);
      this.save();
    }
  }

  deletePrompt(id) {
    this.state.promptTemplates = this.state.promptTemplates.filter(x => x.id !== id);
    this.save();
  }

  // --- Commands / Atajos CRUD ---
  addCommand(name, desc, icon = 'terminal') {
    let cleanName = name.trim();
    if (!cleanName.startsWith('/')) cleanName = '/' + cleanName;
    const id = 'cmd_' + Date.now();
    const newCmd = { id, name: cleanName, desc: desc.trim(), icon };
    this.state.customCommands.push(newCmd);
    this.save();
    return newCmd;
  }

  updateCommand(id, updates) {
    const c = this.state.customCommands.find(x => x.id === id);
    if (c) {
      if (updates.name && !updates.name.startsWith('/')) {
        updates.name = '/' + updates.name.trim();
      }
      Object.assign(c, updates);
      this.save();
    }
  }

  deleteCommand(id) {
    this.state.customCommands = this.state.customCommands.filter(x => x.id !== id);
    this.save();
  }

  // --- Messages ---
  addMessage(chatId, { role, content, files = [], thought = '', toolCalls = [], steps = [] }) {
    const chat = this.state.chats.find(x => x.id === chatId);
    if (!chat) return null;
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const msg = {
      id: msgId,
      role,
      content,
      files,
      thought,
      toolCalls,
      steps,
      timestamp: new Date().toISOString()
    };
    chat.messages.push(msg);
    chat.updatedAt = new Date().toISOString();
    
    const estimatedTokens = Math.ceil((content || '').length / 4);
    this.state.tokenUsage.total += estimatedTokens;

    this.save();
    return msg;
  }

  updateMessage(chatId, msgId, updates) {
    const chat = this.state.chats.find(x => x.id === chatId);
    if (chat) {
      const msg = chat.messages.find(m => m.id === msgId);
      if (msg) {
        Object.assign(msg, updates);
        chat.updatedAt = new Date().toISOString();
        this.save();
      }
    }
  }

  addLog(type, message, details = null) {
    const log = {
      id: 'log_' + Date.now(),
      type,
      message,
      details,
      timestamp: new Date().toLocaleTimeString()
    };
    this.state.logs.unshift(log);
    if (this.state.logs.length > 200) this.state.logs.pop();
    this.save(true);
  }

  clearLogs() {
    this.state.logs = [];
    this.save(true);
  }
}

window.appStore = new Store();
