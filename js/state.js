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
      projects: [],
      folders: [],
      chats: [],
      activeChatId: null,
      activeProjectId: null,
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

        return {
          ...defaults,
          ...parsed,
          config
        };
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
    if (!remote) return;
    let hasChanges = false;

    // Check Projects
    if (Array.isArray(remote.projects)) {
      if (JSON.stringify(this.state.projects) !== JSON.stringify(remote.projects)) {
        this.state.projects = remote.projects;
        hasChanges = true;
      }
    }

    // Check Folders
    if (Array.isArray(remote.folders)) {
      if (JSON.stringify(this.state.folders) !== JSON.stringify(remote.folders)) {
        this.state.folders = remote.folders;
        hasChanges = true;
      }
    }

    // Check Chats
    if (Array.isArray(remote.chats)) {
      if (JSON.stringify(this.state.chats) !== JSON.stringify(remote.chats)) {
        this.state.chats = remote.chats;
        if (!this.state.activeChatId && remote.chats.length > 0) {
          this.state.activeChatId = remote.chats[0].id;
        }
        hasChanges = true;
      }
    }

    // Check Commands
    if (Array.isArray(remote.customCommands) && remote.customCommands.length > 0) {
      if (JSON.stringify(this.state.customCommands) !== JSON.stringify(remote.customCommands)) {
        this.state.customCommands = remote.customCommands;
        hasChanges = true;
      }
    }

    // Check Prompts
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
    const proj = { id, name, icon, createdAt: new Date().toISOString(), archived: false };
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
    if (this.state.activeProjectId === id) this.state.activeProjectId = null;
    this.save();
  }

  // --- Folders CRUD ---
  addFolder(name, projectId) {
    const id = 'fold_' + Date.now();
    const folder = { id, name, projectId, createdAt: new Date().toISOString() };
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
      title,
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
