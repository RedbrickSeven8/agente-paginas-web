// State Management for Studio Agent Client
class Store {
  constructor() {
    this.STORAGE_KEY = 'studio_agent_data_v1';
    this.state = this.load();
    this.listeners = [];
    this.debounceTimer = null;
    this.initSync();
  }

  getDefaultDefaultsSupabase() {
    return {
      supabaseUrl: 'https://hnseeyykbckcofnrwirv.supabase.co',
      supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhuc2VleXlrYmNrY29mbnJ3aXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDExMDQ3MiwiZXhwIjoyMTA1Njg2NDcyfQ.j-XHRLth6X2UpU4QfjmMjHjG7lB-fF6JIhlRnblFock'
    };
  }

  getDefaults() {
    const supaDefaults = this.getDefaultDefaultsSupabase();
    return {
      config: {
        apiUrl: 'https://api.dify.ai/v1',
        apiKey: 'app-CSpN9ANweE2UjmdYvMqjURaF',
        userId: 'Dani',
        supabaseUrl: supaDefaults.supabaseUrl,
        supabaseKey: supaDefaults.supabaseKey,
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
              content: '¡Bienvenido a **Studio Agent**! Tu espacio de trabajo para creación, desarrollo y optimización de páginas web modernas con sincronización en tiempo real con Supabase.\n\nPuedes usar los comandos rápidos como `/landing`, `/variaspaginas`, `/crealasimagenes` o `/creartextos` para comenzar de inmediato.',
              files: [],
              thought: '',
              toolCalls: [],
              steps: [
                {
                  id: 'step_init_1',
                  title: 'Entorno de desarrollo listo',
                  type: 'terminal',
                  detail: 'Workspace sincronizado universalmente con Supabase',
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
      const defaults = this.getDefaults();
      const supaDefaults = this.getDefaultDefaultsSupabase();

      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Force unified default user ID if not explicitly set
        const config = { ...defaults.config, ...(parsed.config || {}) };
        config.userId = 'Dani';
        if (!config.supabaseUrl) config.supabaseUrl = supaDefaults.supabaseUrl;
        if (!config.supabaseKey) config.supabaseKey = supaDefaults.supabaseKey;

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

        // Validate activeChatId exists
        if (stateObj.chats && stateObj.chats.length > 0) {
          const chatExists = stateObj.chats.some(c => c.id === stateObj.activeChatId);
          if (!chatExists) {
            stateObj.activeChatId = stateObj.chats[0].id;
          }
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
    // Initial fetch of workspace on startup
    const doSync = async () => {
      if (window.cloudSyncService) {
        await window.cloudSyncService.pullState(this.state.config.userId, (remoteData) => {
          this.mergeRemoteData(remoteData);
        });
      }
    };

    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doSync);
      } else {
        doSync();
      }
    }
  }

  mergeRemoteData(remote) {
    if (!remote || typeof remote !== 'object') return;
    let hasChanges = false;

    // 1. Replace Projects with Remote authoritative state if present
    if (Array.isArray(remote.projects)) {
      if (JSON.stringify(this.state.projects) !== JSON.stringify(remote.projects)) {
        this.state.projects = remote.projects;
        if (!this.state.activeProjectId && remote.projects.length > 0) {
          this.state.activeProjectId = remote.projects[0].id;
        }
        hasChanges = true;
      }
    }

    // 2. Replace Folders with Remote authoritative state
    if (Array.isArray(remote.folders)) {
      if (JSON.stringify(this.state.folders) !== JSON.stringify(remote.folders)) {
        this.state.folders = remote.folders;
        hasChanges = true;
      }
    }

    // 3. Replace Chats with Remote authoritative state (preserve active streaming chat)
    if (Array.isArray(remote.chats)) {
      if (window.isAgentBusy && window.isAgentBusy() && this.state.activeChatId) {
        // If agent is streaming in active chat, preserve local messages of active chat
        const currentActiveChat = this.state.chats.find(c => c.id === this.state.activeChatId);
        const mergedChats = remote.chats.map(rc => {
          if (rc.id === this.state.activeChatId && currentActiveChat) {
            return { ...rc, messages: currentActiveChat.messages, difyConversationId: currentActiveChat.difyConversationId || rc.difyConversationId };
          }
          return rc;
        });
        if (JSON.stringify(this.state.chats) !== JSON.stringify(mergedChats)) {
          this.state.chats = mergedChats;
          hasChanges = true;
        }
      } else {
        if (JSON.stringify(this.state.chats) !== JSON.stringify(remote.chats)) {
          this.state.chats = remote.chats;
          if (!this.state.activeChatId && remote.chats.length > 0) {
            this.state.activeChatId = remote.chats[0].id;
          }
          hasChanges = true;
        }
      }
    }

    // 4. Replace Commands
    if (Array.isArray(remote.customCommands)) {
      if (JSON.stringify(this.state.customCommands) !== JSON.stringify(remote.customCommands)) {
        this.state.customCommands = remote.customCommands;
        hasChanges = true;
      }
    }

    // 5. Replace Prompts
    if (Array.isArray(remote.promptTemplates)) {
      if (JSON.stringify(this.state.promptTemplates) !== JSON.stringify(remote.promptTemplates)) {
        this.state.promptTemplates = remote.promptTemplates;
        hasChanges = true;
      }
    }

    // 6. Token Usage
    if (remote.tokenUsage && typeof remote.tokenUsage === 'object') {
      this.state.tokenUsage = remote.tokenUsage;
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

  // --- Active Chat Helper ---
  getActiveChat() {
    if (!this.state.chats || this.state.chats.length === 0) return null;
    let found = this.state.chats.find(c => c.id === this.state.activeChatId);
    if (!found) {
      // Fallback to first available chat
      found = this.state.chats[0];
      this.state.activeChatId = found.id;
    }
    return found;
  }

  selectChat(chatId) {
    const chat = this.state.chats.find(c => c.id === chatId);
    if (chat) {
      this.state.activeChatId = chat.id;
      if (chat.projectId) {
        this.state.activeProjectId = chat.projectId;
      }
      this.save();
      return chat;
    }
    return null;
  }

  // --- Projects ---
  addProject(name, icon = 'folder') {
    const project = {
      id: 'proj_' + Date.now(),
      name: name || 'Nuevo Proyecto',
      icon,
      createdAt: new Date().toISOString(),
      archived: false
    };
    this.state.projects.push(project);
    this.state.activeProjectId = project.id;
    this.save();
    return project;
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
      this.state.activeProjectId = this.state.projects[0]?.id || null;
      this.state.activeChatId = this.state.chats.find(c => c.projectId === this.state.activeProjectId)?.id || this.state.chats[0]?.id || null;
    }
    this.save();
  }

  // --- Folders ---
  addFolder(name, projectId) {
    const folder = {
      id: 'fold_' + Date.now(),
      name: name || 'Nueva Carpeta',
      projectId: projectId || this.state.activeProjectId,
      createdAt: new Date().toISOString()
    };
    this.state.folders.push(folder);
    this.save();
    return folder;
  }

  updateFolder(id, name) {
    const f = this.state.folders.find(x => x.id === id);
    if (f) {
      f.name = name;
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

  // --- Chats (Polymorphic: supports either addChat({title, projectId, folderId}) or addChat(projectId, folderId, title)) ---
  addChat(arg1 = null, arg2 = null, arg3 = null) {
    let projectId = null;
    let folderId = null;
    let title = 'Nueva Conversación';

    if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1)) {
      projectId = ('projectId' in arg1) ? arg1.projectId : this.state.activeProjectId;
      folderId = arg1.folderId || null;
      title = arg1.title || 'Nueva Conversación';
    } else {
      projectId = (arg1 !== undefined && arg1 !== null) ? arg1 : this.state.activeProjectId;
      folderId = arg2 || null;
      title = arg3 || 'Nueva Conversación';
    }

    const chat = {
      id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: title || 'Nueva Conversación',
      projectId: projectId || null,
      folderId: folderId || null,
      pinned: false,
      archived: false,
      tags: [],
      messages: [],
      difyConversationId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!Array.isArray(this.state.chats)) {
      this.state.chats = [];
    }

    this.state.chats.unshift(chat);
    this.state.activeChatId = chat.id;
    if (chat.projectId) {
      this.state.activeProjectId = chat.projectId;
    }
    this.save();
    return chat;
  }

  updateChat(id, updates) {
    const chat = this.state.chats.find(x => x.id === id);
    if (chat) {
      Object.assign(chat, updates);
      chat.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  deleteChat(id) {
    this.state.chats = this.state.chats.filter(x => x.id !== id);
    if (this.state.activeChatId === id) {
      const remaining = this.state.chats.filter(c => c.projectId === this.state.activeProjectId);
      this.state.activeChatId = remaining[0]?.id || this.state.chats[0]?.id || null;
    }
    this.save();
  }

  // --- Messages ---
  addMessage(chatId, { role, content, files = [], thought = '', toolCalls = [], steps = [] }, skipCloudPush = false) {
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
    if (!Array.isArray(chat.messages)) {
      chat.messages = [];
    }
    chat.messages.push(msg);
    chat.updatedAt = new Date().toISOString();
    
    const estimatedTokens = Math.ceil((content || '').length / 4);
    this.state.tokenUsage.total += estimatedTokens;

    this.save(skipCloudPush);
    return msg;
  }

  updateMessage(chatId, msgId, updates, skipCloudPush = false) {
    const chat = this.state.chats.find(x => x.id === chatId);
    if (chat && Array.isArray(chat.messages)) {
      const msg = chat.messages.find(m => m.id === msgId);
      if (msg) {
        Object.assign(msg, updates);
        chat.updatedAt = new Date().toISOString();
        this.save(skipCloudPush);
      }
    }
  }


  // --- Commands CRUD ---
  addCommand(name, desc) {
    const newCmd = {
      id: 'cmd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.startsWith('/') ? name : '/' + name,
      desc
    };
    if (!Array.isArray(this.state.customCommands)) {
      this.state.customCommands = [];
    }
    this.state.customCommands.push(newCmd);
    this.save();
    return newCmd;
  }

  updateCommand(id, updates) {
    if (!Array.isArray(this.state.customCommands)) return;
    const cmd = this.state.customCommands.find(c => c.id === id);
    if (cmd) {
      if (updates.name) {
        updates.name = updates.name.startsWith('/') ? updates.name : '/' + updates.name;
      }
      Object.assign(cmd, updates);
      this.save();
    }
  }

  deleteCommand(id) {
    if (!Array.isArray(this.state.customCommands)) return;
    this.state.customCommands = this.state.customCommands.filter(c => c.id !== id);
    this.save();
  }

  // --- Prompts CRUD ---
  addPrompt(title, text) {
    const newPrompt = {
      id: 'prompt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title,
      text
    };
    if (!Array.isArray(this.state.promptTemplates)) {
      this.state.promptTemplates = [];
    }
    this.state.promptTemplates.push(newPrompt);
    this.save();
    return newPrompt;
  }

  updatePrompt(id, updates) {
    if (!Array.isArray(this.state.promptTemplates)) return;
    const prompt = this.state.promptTemplates.find(p => p.id === id);
    if (prompt) {
      Object.assign(prompt, updates);
      this.save();
    }
  }

  deletePrompt(id) {
    if (!Array.isArray(this.state.promptTemplates)) return;
    this.state.promptTemplates = this.state.promptTemplates.filter(p => p.id !== id);
    this.save();
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
