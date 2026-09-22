// State Management for Studio Agent Client
class Store {
  constructor() {
    this.STORAGE_KEY = 'studio_agent_data_v1';
    this.state = this.load();
    this.listeners = [];
  }

  getDefaults() {
    return {
      config: {
        apiUrl: 'https://api.dify.ai/v1',
        apiKey: 'app-CSpN9ANweE2UjmdYvMqjURaF',
        userId: 'user-' + Math.random().toString(36).substring(2, 11),
        theme: 'dark', // 'dark' (OLED True Black), 'light'
        zenMode: false
      },
      projects: [],
      folders: [],
      chats: [],
      activeChatId: null,
      activeProjectId: null,
      customCommands: [
        { name: '/editalasimagenes', desc: 'Edición de estilo, fondo y estética de imágenes adjuntas.', icon: 'wand-2' },
        { name: '/crealasimagenes', desc: 'Generación de todas las imágenes del sitio web desde cero.', icon: 'image-plus' },
        { name: '/combinalasimagenes', desc: 'Fusión de imágenes del usuario con recursos generados por IA.', icon: 'layers' },
        { name: '/variaspaginas', desc: 'Creación de estructura de sitio web multipágina con menú.', icon: 'globe' },
        { name: '/landing', desc: 'Consolidación de contenido en una sola Landing Page.', icon: 'layout-template' },
        { name: '/creartextos', desc: 'Redacción de copy y textos comerciales desde cero.', icon: 'file-text' }
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
        return { ...defaults, ...parsed, config: { ...defaults.config, ...(parsed.config || {}) } };
      }
    } catch (e) {
      console.error('Error loading state:', e);
    }
    return this.getDefaults();
  }

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
      this.notify();
    } catch (e) {
      console.error('Error saving state:', e);
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

  // --- CRUD Actions ---
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

  addMessage(chatId, { role, content, files = [], thought = '', toolCalls = [] }) {
    const chat = this.state.chats.find(x => x.id === chatId);
    if (!chat) return null;
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const msg = {
      id: msgId,
      role, // 'user' | 'assistant'
      content,
      files,
      thought,
      toolCalls,
      timestamp: new Date().toISOString()
    };
    chat.messages.push(msg);
    chat.updatedAt = new Date().toISOString();
    
    // Estimate tokens: roughly 1 token per 4 characters
    const estimatedTokens = Math.ceil(content.length / 4);
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
      type, // 'info' | 'warn' | 'error' | 'api' | 'sse'
      message,
      details,
      timestamp: new Date().toLocaleTimeString()
    };
    this.state.logs.unshift(log);
    if (this.state.logs.length > 200) this.state.logs.pop();
    this.save();
  }

  clearLogs() {
    this.state.logs = [];
    this.save();
  }
}

window.appStore = new Store();
