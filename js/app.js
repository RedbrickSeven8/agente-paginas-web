// Main Application Controller & UI Binder
document.addEventListener('DOMContentLoaded', () => {
  const store = window.appStore;
  const dify = window.difyService;
  const canvas = window.canvasManager;

  // State local pointers
  let pendingAttachments = []; // files ready to send
  let activeSlashIndex = 0;
  let filteredCommands = [];

  // DOM Elements
  const chatMessagesEl = document.getElementById('chat-messages');
  const chatInputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('btn-send');
  const stopBtn = document.getElementById('btn-stop');
  const attachmentDock = document.getElementById('attachment-dock');
  const fileInput = document.getElementById('file-upload-input');
  const slashMenu = document.getElementById('slash-command-menu');
  const dynamicIsland = document.getElementById('dynamic-island');
  const dynamicIslandText = document.getElementById('dynamic-island-text');
  const dynamicIslandBadge = document.getElementById('dynamic-island-badge');
  const tokenCounterEl = document.getElementById('token-counter');

  // Initialize Feather / Lucide Icons
  if (window.lucide) lucide.createIcons();

  // --- Theme Initializer ---
  document.documentElement.setAttribute('data-theme', store.state.config.theme || 'dark');

  // --- Render Functions ---
  function renderSidebar() {
    // Render Projects
    const projectsListEl = document.getElementById('projects-list');
    if (!projectsListEl) return;

    const projects = store.state.projects;
    projectsListEl.innerHTML = '';

    if (projects.length === 0) {
      projectsListEl.innerHTML = `
        <div class="px-3 py-4 text-center text-xs text-neutral-500">
          <p>Sin proyectos creados</p>
          <p class="text-[10px] mt-1 text-neutral-600">Haz clic en + para organizar chats</p>
        </div>
      `;
    } else {
      projects.forEach(p => {
        const isActive = p.id === store.state.activeProjectId;
        const projectFolders = store.state.folders.filter(f => f.projectId === p.id);
        const projectChats = store.state.chats.filter(c => c.projectId === p.id && !c.folderId);

        const pDiv = document.createElement('div');
        pDiv.className = `group mb-2 rounded-xl p-2 transition-all ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`;
        pDiv.innerHTML = `
          <div class="flex items-center justify-between cursor-pointer" data-project-id="${p.id}">
            <div class="flex items-center space-x-2 truncate">
              <span class="w-2 h-2 rounded-full ${isActive ? 'bg-blue-400' : 'bg-neutral-600'}"></span>
              <span class="text-xs font-semibold ${isActive ? 'text-white' : 'text-neutral-300'}">${escapeHtml(p.name)}</span>
            </div>
            <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button class="btn-add-folder p-1 text-neutral-400 hover:text-white" title="Nueva Carpeta" data-project-id="${p.id}">
                <i data-lucide="folder-plus" class="w-3.5 h-3.5"></i>
              </button>
              <button class="btn-add-proj-chat p-1 text-neutral-400 hover:text-white" title="Nuevo Chat en Proyecto" data-project-id="${p.id}">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              </button>
              <button class="btn-del-proj p-1 text-neutral-400 hover:text-red-400" title="Eliminar Proyecto" data-project-id="${p.id}">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
          
          <!-- Folders Inside Project -->
          <div class="pl-3 mt-1.5 space-y-1">
            ${projectFolders.map(f => {
              const folderChats = store.state.chats.filter(c => c.folderId === f.id);
              return `
                <div class="folder-group">
                  <div class="flex items-center justify-between text-[11px] text-neutral-400 py-1 px-1.5 rounded hover:bg-white/5 cursor-pointer" data-folder-id="${f.id}">
                    <span class="flex items-center space-x-1.5 truncate">
                      <i data-lucide="folder" class="w-3 h-3 text-neutral-500"></i>
                      <span>${escapeHtml(f.name)}</span>
                    </span>
                    <div class="flex items-center space-x-1">
                      <button class="btn-add-folder-chat p-0.5 hover:text-white" data-project-id="${p.id}" data-folder-id="${f.id}">
                        <i data-lucide="plus" class="w-3 h-3"></i>
                      </button>
                    </div>
                  </div>
                  <div class="pl-3 space-y-0.5">
                    ${folderChats.map(c => renderChatItem(c)).join('')}
                  </div>
                </div>
              `;
            }).join('')}
            <!-- Standalone Chats in Project -->
            ${projectChats.map(c => renderChatItem(c)).join('')}
          </div>
        `;
        projectsListEl.appendChild(pDiv);
      });
    }

    // Render Standalone / Unassigned Chats
    const standaloneChatsEl = document.getElementById('standalone-chats-list');
    if (standaloneChatsEl) {
      const standalone = store.state.chats.filter(c => !c.projectId && !c.folderId);
      if (standalone.length === 0) {
        standaloneChatsEl.innerHTML = '<div class="px-3 py-2 text-xs text-neutral-600">No hay chats sueltos</div>';
      } else {
        standaloneChatsEl.innerHTML = standalone.map(c => renderChatItem(c)).join('');
      }
    }

    // Render Pinned Chats
    const pinnedChatsEl = document.getElementById('pinned-chats-list');
    if (pinnedChatsEl) {
      const pinned = store.state.chats.filter(c => c.pinned);
      if (pinned.length === 0) {
        document.getElementById('pinned-section')?.classList.add('hidden');
      } else {
        document.getElementById('pinned-section')?.classList.remove('hidden');
        pinnedChatsEl.innerHTML = pinned.map(c => renderChatItem(c, true)).join('');
      }
    }

    if (window.lucide) lucide.createIcons();
  }

  function renderChatItem(chat, isPinnedView = false) {
    const isActive = chat.id === store.state.activeChatId;
    return `
      <div class="chat-item-row group flex items-center justify-between text-xs py-1.5 px-2 rounded-lg cursor-pointer transition-all ${isActive ? 'bg-blue-600/20 text-blue-300 font-medium border border-blue-500/30' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'}" data-chat-id="${chat.id}">
        <div class="flex items-center space-x-2 truncate">
          <i data-lucide="${chat.pinned ? 'pin' : 'message-square'}" class="w-3.5 h-3.5 ${chat.pinned ? 'text-amber-400' : 'text-neutral-500'} shrink-0"></i>
          <span class="truncate">${escapeHtml(chat.title || 'Conversación')}</span>
        </div>
        <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button class="btn-pin-chat p-1 hover:text-amber-400" data-chat-id="${chat.id}" title="${chat.pinned ? 'Desanclar' : 'Anclar'}">
            <i data-lucide="pin" class="w-3 h-3"></i>
          </button>
          <button class="btn-del-chat p-1 hover:text-red-400" data-chat-id="${chat.id}" title="Eliminar">
            <i data-lucide="trash-2" class="w-3 h-3"></i>
          </button>
        </div>
      </div>
    `;
  }

  function renderMessages() {
    const activeChat = store.getActiveChat();
    chatMessagesEl.innerHTML = '';

    if (!activeChat || activeChat.messages.length === 0) {
      chatMessagesEl.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-6 shadow-2xl pulse-glow">
            <i data-lucide="sparkles" class="w-8 h-8 text-blue-400"></i>
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-white mb-2">Studio Agent Workspace</h2>
          <p class="text-sm text-neutral-400 mb-8 leading-relaxed">
            Tu copiloto de desarrollo y diseño UI/UX. Conectado vía SSE a Dify API con soporte multimodal, generación de páginas, canvas interactivo y comandos rápidos.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <button class="quick-prompt-card p-3.5 rounded-xl apple-glass text-left hover:border-white/20 transition-all group" data-prompt="/landing Crea una Landing Page moderna para una Startup de IA con estética Apple y modo oscuro.">
              <div class="flex items-center space-x-2 text-blue-400 mb-1">
                <i data-lucide="layout-template" class="w-4 h-4"></i>
                <span class="text-xs font-semibold">Landing Page</span>
              </div>
              <p class="text-xs text-neutral-400 group-hover:text-neutral-200">/landing para una Startup de IA</p>
            </button>
            <button class="quick-prompt-card p-3.5 rounded-xl apple-glass text-left hover:border-white/20 transition-all group" data-prompt="/crealasimagenes Genera imágenes hiperrealistas y mockups para un dashboard de analítica.">
              <div class="flex items-center space-x-2 text-purple-400 mb-1">
                <i data-lucide="image-plus" class="w-4 h-4"></i>
                <span class="text-xs font-semibold">Generar Imágenes</span>
              </div>
              <p class="text-xs text-neutral-400 group-hover:text-neutral-200">/crealasimagenes para UI Assets</p>
            </button>
            <button class="quick-prompt-card p-3.5 rounded-xl apple-glass text-left hover:border-white/20 transition-all group" data-prompt="/variaspaginas Diseña una web corporativa completa con Inicio, Servicios, Portfolio y Contacto.">
              <div class="flex items-center space-x-2 text-emerald-400 mb-1">
                <i data-lucide="globe" class="w-4 h-4"></i>
                <span class="text-xs font-semibold">Sitio Multipágina</span>
              </div>
              <p class="text-xs text-neutral-400 group-hover:text-neutral-200">/variaspaginas con menú y rutas</p>
            </button>
            <button class="quick-prompt-card p-3.5 rounded-xl apple-glass text-left hover:border-white/20 transition-all group" data-prompt="/creartextos Redacta copys persuasivos de alta conversión para venta de servicios digitales.">
              <div class="flex items-center space-x-2 text-amber-400 mb-1">
                <i data-lucide="file-text" class="w-4 h-4"></i>
                <span class="text-xs font-semibold">Copywriting</span>
              </div>
              <p class="text-xs text-neutral-400 group-hover:text-neutral-200">/creartextos de alta conversión</p>
            </button>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    activeChat.messages.forEach(msg => {
      appendMessageToDOM(msg, false);
    });

    scrollToBottom();
    if (window.lucide) lucide.createIcons();
    if (window.hljs) hljs.highlightAll();
  }

  function appendMessageToDOM(msg, shouldScroll = true) {
    const isUser = msg.role === 'user';
    const msgEl = document.createElement('div');
    msgEl.id = msg.id;
    msgEl.className = `flex flex-col mb-6 ${isUser ? 'items-end' : 'items-start'} message-appear`;

    let filesHtml = '';
    if (msg.files && msg.files.length > 0) {
      filesHtml = `
        <div class="flex flex-wrap gap-2 mb-2">
          ${msg.files.map(f => `
            <div class="flex items-center space-x-2 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-neutral-300">
              <i data-lucide="paperclip" class="w-3.5 h-3.5 text-blue-400"></i>
              <span class="truncate max-w-[150px]">${escapeHtml(f.name || 'Archivo')}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    let thoughtHtml = '';
    if (msg.thought) {
      thoughtHtml = `
        <div class="w-full mb-3 p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-300 flex items-start space-x-2">
          <i data-lucide="cpu" class="w-4 h-4 text-purple-400 shrink-0 mt-0.5"></i>
          <div class="flex-1 whitespace-pre-wrap">${escapeHtml(msg.thought)}</div>
        </div>
      `;
    }

    let toolCallsHtml = '';
    if (msg.toolCalls && msg.toolCalls.length > 0) {
      toolCallsHtml = `
        <div class="flex flex-wrap gap-1.5 mb-2">
          ${msg.toolCalls.map(t => `
            <span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <i data-lucide="terminal" class="w-3 h-3"></i>
              <span>Herramienta: ${escapeHtml(t)}</span>
            </span>
          `).join('')}
        </div>
      `;
    }

    let parsedContent = marked.parse(msg.content || '');

    msgEl.innerHTML = `
      <div class="flex items-center space-x-2 mb-1 text-[11px] text-neutral-400">
        <span class="font-medium ${isUser ? 'text-blue-400' : 'text-purple-400'}">${isUser ? 'Tú' : 'Studio Agent'}</span>
        <span>•</span>
        <span>${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${isUser ? 'bg-blue-600 text-white rounded-br-none shadow-lg' : 'apple-glass text-neutral-200 rounded-bl-none shadow-xl'}">
        ${filesHtml}
        ${toolCallsHtml}
        ${thoughtHtml}
        <div class="markdown-body prose prose-invert text-sm leading-relaxed overflow-x-auto select-text">
          ${parsedContent}
        </div>
      </div>
      <div class="flex items-center space-x-2 mt-1.5 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <button class="btn-copy-msg text-[11px] hover:text-white flex items-center space-x-1" data-msg-id="${msg.id}">
          <i data-lucide="copy" class="w-3 h-3"></i>
          <span>Copiar</span>
        </button>
        ${!isUser ? `
          <button class="btn-open-canvas text-[11px] hover:text-blue-400 flex items-center space-x-1" data-msg-id="${msg.id}">
            <i data-lucide="sidebar" class="w-3 h-3"></i>
            <span>Ver Canvas</span>
          </button>
        ` : `
          <button class="btn-edit-msg text-[11px] hover:text-blue-400 flex items-center space-x-1" data-msg-id="${msg.id}">
            <i data-lucide="edit-3" class="w-3 h-3"></i>
            <span>Editar</span>
          </button>
        `}
      </div>
    `;

    chatMessagesEl.appendChild(msgEl);
    if (shouldScroll) scrollToBottom();
    if (window.lucide) lucide.createIcons();
  }

  function scrollToBottom() {
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  function updateDynamicIsland(text, badge = 'Listo', isBusy = false) {
    if (dynamicIslandText) dynamicIslandText.textContent = text;
    if (dynamicIslandBadge) {
      dynamicIslandBadge.textContent = badge;
      dynamicIslandBadge.className = `px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${isBusy ? 'bg-amber-500/20 text-amber-300 animate-pulse' : 'bg-blue-500/20 text-blue-300'}`;
    }
  }

  function updateTokenCounter() {
    if (tokenCounterEl) {
      const { total, limit } = store.state.tokenUsage;
      tokenCounterEl.textContent = `${total.toLocaleString()} / ${(limit/1000).toFixed(0)}k tokens`;
    }
  }

  // --- Send Message & Stream Handler ---
  async function handleSendMessage() {
    const text = chatInputEl.value.trim();
    if (!text && pendingAttachments.length === 0) return;

    // Check if there is an active chat; if not, create one
    let activeChat = store.getActiveChat();
    if (!activeChat) {
      activeChat = store.addChat({ title: text.substring(0, 30) || 'Nuevo Chat', projectId: store.state.activeProjectId });
    } else if (activeChat.messages.length === 0 && text) {
      // update title based on first query
      store.updateChat(activeChat.id, { title: text.substring(0, 30) });
    }

    const currentFiles = [...pendingAttachments];
    pendingAttachments = [];
    renderAttachmentDock();

    // Clear input
    chatInputEl.value = '';
    chatInputEl.style.height = 'auto';
    slashMenu.classList.add('hidden');

    // Add user message to state
    store.addMessage(activeChat.id, {
      role: 'user',
      content: text,
      files: currentFiles
    });
    renderMessages();

    // UI Busy State
    sendBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    updateDynamicIsland('Ejecutando Agente...', 'En vivo', true);

    // Create placeholder assistant message
    const assistantMsg = store.addMessage(activeChat.id, {
      role: 'assistant',
      content: 'Pensando...',
      thought: '',
      toolCalls: []
    });

    let fullAnswer = '';
    let fullThought = '';
    let toolList = [];

    // Send to Dify
    await dify.sendMessage({
      query: text,
      files: currentFiles,
      chatId: activeChat.id,
      onChunk: (accumulated, chunk) => {
        fullAnswer = accumulated;
        store.updateMessage(activeChat.id, assistantMsg.id, { content: fullAnswer });
        updateMessageDOM(assistantMsg.id, fullAnswer, fullThought, toolList);
      },
      onThought: (accumulatedThought, tool, toolInput) => {
        fullThought = accumulatedThought;
        if (tool && !toolList.includes(tool)) toolList.push(tool);
        updateDynamicIsland(tool ? `Herramienta: ${tool}` : 'Analizando contexto...', 'Ejecutando', true);
        store.updateMessage(activeChat.id, assistantMsg.id, { thought: fullThought, toolCalls: toolList });
        updateMessageDOM(assistantMsg.id, fullAnswer, fullThought, toolList);
      },
      onComplete: (content, thought, tools) => {
        sendBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        updateDynamicIsland('En reposo', 'Listo', false);
        store.updateMessage(activeChat.id, assistantMsg.id, { content: content || fullAnswer, thought, toolCalls: tools });
        renderMessages();
        renderSidebar();
        updateTokenCounter();

        // Check if code contains HTML to automatically populate side canvas
        if (content && (content.includes('<!DOCTYPE html>') || content.includes('<html') || content.includes('```html'))) {
          const match = content.match(/```html([\s\S]*?)```/);
          const rawHtml = match ? match[1] : (content.includes('<html') ? content : null);
          if (rawHtml) {
            canvas.open('preview', rawHtml);
          }
        }
      },
      onError: (err) => {
        sendBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        updateDynamicIsland('Error en respuesta', 'Alerta', false);
        store.updateMessage(activeChat.id, assistantMsg.id, {
          content: `⚠️ Hubo un error al procesar tu solicitud: ${err.message}`
        });
        renderMessages();
      }
    });
  }

  function updateMessageDOM(msgId, content, thought, tools) {
    const el = document.getElementById(msgId);
    if (!el) {
      renderMessages();
      return;
    }
    const mdBody = el.querySelector('.markdown-body');
    if (mdBody) {
      mdBody.innerHTML = marked.parse(content || '');
    }
    scrollToBottom();
  }

  // --- Attachments & File Handling ---
  function renderAttachmentDock() {
    if (pendingAttachments.length === 0) {
      attachmentDock.classList.add('hidden');
      attachmentDock.innerHTML = '';
      return;
    }
    attachmentDock.classList.remove('hidden');
    attachmentDock.innerHTML = pendingAttachments.map((f, idx) => `
      <div class="flex items-center space-x-2 bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-neutral-200">
        <i data-lucide="${f.type.startsWith('image') ? 'image' : 'file'}" class="w-3.5 h-3.5 text-blue-400"></i>
        <span class="truncate max-w-[120px]">${escapeHtml(f.name)}</span>
        <button class="btn-remove-attachment p-0.5 hover:text-red-400" data-index="${idx}">
          <i data-lucide="x" class="w-3 h-3"></i>
        </button>
      </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
  }

  async function handleFileUpload(files) {
    if (!files || files.length === 0) return;
    updateDynamicIsland('Subiendo adjuntos...', 'Cargando', true);

    for (const file of Array.from(files)) {
      try {
        const uploadRes = await dify.uploadFile(file);
        pendingAttachments.push({
          id: uploadRes.id,
          name: file.name,
          type: file.type || 'document',
          size: file.size
        });
      } catch (err) {
        alert(`Error al subir ${file.name}: ${err.message}`);
      }
    }
    renderAttachmentDock();
    updateDynamicIsland('En reposo', 'Listo', false);
  }

  // --- Slash Command Interceptor ---
  function handleSlashInput() {
    const text = chatInputEl.value;
    const cursorPos = chatInputEl.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

    if (lastSlashIndex !== -1 && !textBeforeCursor.substring(lastSlashIndex).includes(' ')) {
      const query = textBeforeCursor.substring(lastSlashIndex).toLowerCase();
      filteredCommands = store.state.customCommands.filter(c => c.name.toLowerCase().startsWith(query));

      if (filteredCommands.length > 0) {
        renderSlashMenu(filteredCommands);
        slashMenu.classList.remove('hidden');
        return;
      }
    }
    slashMenu.classList.add('hidden');
  }

  function renderSlashMenu(commands) {
    slashMenu.innerHTML = commands.map((c, idx) => `
      <div class="slash-item flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${idx === activeSlashIndex ? 'bg-blue-600/30 text-blue-300 font-medium' : 'text-neutral-300 hover:bg-white/5'}" data-index="${idx}" data-cmd="${c.name}">
        <div class="flex items-center space-x-2">
          <span class="font-mono text-blue-400 text-xs font-bold">${c.name}</span>
          <span class="text-[11px] text-neutral-400 truncate max-w-[220px]">${escapeHtml(c.desc)}</span>
        </div>
        <i data-lucide="${c.icon || 'terminal'}" class="w-3.5 h-3.5 text-neutral-500"></i>
      </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
  }

  function insertSlashCommand(cmdName) {
    const text = chatInputEl.value;
    const cursorPos = chatInputEl.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const textAfterCursor = text.substring(cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

    if (lastSlashIndex !== -1) {
      chatInputEl.value = textBeforeCursor.substring(0, lastSlashIndex) + cmdName + ' ' + textAfterCursor;
      chatInputEl.focus();
      const newCursorPos = lastSlashIndex + cmdName.length + 1;
      chatInputEl.setSelectionRange(newCursorPos, newCursorPos);
    }
    slashMenu.classList.add('hidden');
  }

  // --- Global Keyboard Shortcuts ---
  window.addEventListener('keydown', (e) => {
    // Cmd+K or Ctrl+K for Global Search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('modal-search')?.classList.remove('hidden');
      document.getElementById('search-input-global')?.focus();
    }
    // Cmd+Enter or Ctrl+Enter for Send
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (document.activeElement === chatInputEl) {
        e.preventDefault();
        handleSendMessage();
      }
    }
  });

  // --- Input Event Listeners ---
  chatInputEl.addEventListener('input', () => {
    chatInputEl.style.height = 'auto';
    chatInputEl.style.height = Math.min(chatInputEl.scrollHeight, 180) + 'px';
    handleSlashInput();
  });

  chatInputEl.addEventListener('keydown', (e) => {
    if (!slashMenu.classList.contains('hidden') && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeSlashIndex = (activeSlashIndex + 1) % filteredCommands.length;
        renderSlashMenu(filteredCommands);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeSlashIndex = (activeSlashIndex - 1 + filteredCommands.length) % filteredCommands.length;
        renderSlashMenu(filteredCommands);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertSlashCommand(filteredCommands[activeSlashIndex].name);
      } else if (e.key === 'Escape') {
        slashMenu.classList.add('hidden');
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // --- Buttons & Action Delegations ---
  sendBtn.addEventListener('click', handleSendMessage);
  stopBtn.addEventListener('click', () => dify.stop());

  // Attach button
  document.getElementById('btn-attach')?.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    handleFileUpload(e.target.files);
    fileInput.value = '';
  });

  // Drag and drop onto chat area
  const dropZone = document.getElementById('chat-dropzone');
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-blue-500/50', 'bg-blue-500/5');
    });
    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-blue-500/50', 'bg-blue-500/5');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-blue-500/50', 'bg-blue-500/5');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    });
  }

  // Delegated Clicks
  document.addEventListener('click', (e) => {
    // Slash item click
    const slashItem = e.target.closest('.slash-item');
    if (slashItem) {
      const cmd = slashItem.dataset.cmd;
      if (cmd) insertSlashCommand(cmd);
      return;
    }

    // Quick Prompt Card click
    const promptCard = e.target.closest('.quick-prompt-card');
    if (promptCard) {
      chatInputEl.value = promptCard.dataset.prompt;
      chatInputEl.focus();
      return;
    }

    // Chat select
    const chatRow = e.target.closest('.chat-item-row');
    if (chatRow && !e.target.closest('.btn-pin-chat') && !e.target.closest('.btn-del-chat')) {
      const chatId = chatRow.dataset.chatId;
      store.state.activeChatId = chatId;
      store.save();
      renderSidebar();
      renderMessages();
      return;
    }

    // Chat Pin
    const pinBtn = e.target.closest('.btn-pin-chat');
    if (pinBtn) {
      const chatId = pinBtn.dataset.chatId;
      const c = store.state.chats.find(x => x.id === chatId);
      if (c) store.updateChat(chatId, { pinned: !c.pinned });
      renderSidebar();
      return;
    }

    // Chat Delete
    const delBtn = e.target.closest('.btn-del-chat');
    if (delBtn) {
      const chatId = delBtn.dataset.chatId;
      if (confirm('¿Eliminar esta conversación?')) {
        store.deleteChat(chatId);
        renderSidebar();
        renderMessages();
      }
      return;
    }

    // Project Delete
    const delProjBtn = e.target.closest('.btn-del-proj');
    if (delProjBtn) {
      const pId = delProjBtn.dataset.projectId;
      if (confirm('¿Eliminar este proyecto y sus conversaciones asociadas?')) {
        store.deleteProject(pId);
        renderSidebar();
        renderMessages();
      }
      return;
    }

    // Add Folder to Project
    const addFolderBtn = e.target.closest('.btn-add-folder');
    if (addFolderBtn) {
      const pId = addFolderBtn.dataset.projectId;
      const folderName = prompt('Nombre de la nueva carpeta:');
      if (folderName) {
        store.addFolder(folderName, pId);
        renderSidebar();
      }
      return;
    }

    // Add Chat in Project
    const addProjChatBtn = e.target.closest('.btn-add-proj-chat');
    if (addProjChatBtn) {
      const pId = addProjChatBtn.dataset.projectId;
      store.addChat({ title: 'Nuevo Chat de Proyecto', projectId: pId });
      renderSidebar();
      renderMessages();
      return;
    }

    // Add Chat in Folder
    const addFolderChatBtn = e.target.closest('.btn-add-folder-chat');
    if (addFolderChatBtn) {
      const pId = addFolderChatBtn.dataset.projectId;
      const fId = addFolderChatBtn.dataset.folderId;
      store.addChat({ title: 'Nuevo Chat en Carpeta', projectId: pId, folderId: fId });
      renderSidebar();
      renderMessages();
      return;
    }

    // Copy message
    const copyMsgBtn = e.target.closest('.btn-copy-msg');
    if (copyMsgBtn) {
      const msgId = copyMsgBtn.dataset.msgId;
      const chat = store.getActiveChat();
      const msg = chat?.messages.find(m => m.id === msgId);
      if (msg) {
        navigator.clipboard.writeText(msg.content);
        copyMsgBtn.innerHTML = '<i data-lucide="check" class="w-3 h-3 text-emerald-400"></i><span class="text-emerald-400">Copiado</span>';
        if (window.lucide) lucide.createIcons();
        setTimeout(() => {
          copyMsgBtn.innerHTML = '<i data-lucide="copy" class="w-3 h-3"></i><span>Copiar</span>';
          if (window.lucide) lucide.createIcons();
        }, 1500);
      }
      return;
    }

    // Edit message
    const editMsgBtn = e.target.closest('.btn-edit-msg');
    if (editMsgBtn) {
      const msgId = editMsgBtn.dataset.msgId;
      const chat = store.getActiveChat();
      const msg = chat?.messages.find(m => m.id === msgId);
      if (msg) {
        chatInputEl.value = msg.content;
        chatInputEl.focus();
      }
      return;
    }

    // Open Canvas from message
    const openCanvasBtn = e.target.closest('.btn-open-canvas');
    if (openCanvasBtn) {
      const msgId = openCanvasBtn.dataset.msgId;
      const chat = store.getActiveChat();
      const msg = chat?.messages.find(m => m.id === msgId);
      if (msg) {
        // extract code or show preview
        const codeMatch = msg.content.match(/```(\w+)?\n([\s\S]*?)```/);
        if (codeMatch) {
          const lang = codeMatch[1] || 'html';
          const code = codeMatch[2];
          if (lang === 'html' || code.includes('<html') || code.includes('<!DOCTYPE')) {
            canvas.open('preview', code);
          } else {
            canvas.open('code', { code, lang });
          }
        } else {
          canvas.open('preview', `<div style="font-family:sans-serif;padding:2rem;color:#111;">${marked.parse(msg.content)}</div>`);
        }
      }
      return;
    }

    // Remove pending attachment
    const removeAttBtn = e.target.closest('.btn-remove-attachment');
    if (removeAttBtn) {
      const idx = parseInt(removeAttBtn.dataset.index, 10);
      pendingAttachments.splice(idx, 1);
      renderAttachmentDock();
      return;
    }
  });

  // --- Zen Mode Toggle ---
  document.getElementById('btn-zen-mode')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const isZen = sidebar.classList.toggle('-translate-x-full');
    store.state.config.zenMode = isZen;
    store.save();
  });

  // --- New Chat Button ---
  document.getElementById('btn-new-chat')?.addEventListener('click', () => {
    store.addChat({ title: 'Nueva Conversación' });
    renderSidebar();
    renderMessages();
  });

  // --- New Project Button ---
  document.getElementById('btn-new-project')?.addEventListener('click', () => {
    const name = prompt('Nombre del nuevo proyecto:');
    if (name) {
      store.addProject(name);
      renderSidebar();
    }
  });

  // --- Modals Setup (Settings, Commands, Debugger, Export) ---
  const modals = {
    settings: document.getElementById('modal-settings'),
    commands: document.getElementById('modal-commands'),
    debugger: document.getElementById('modal-debugger'),
    export: document.getElementById('modal-export'),
    search: document.getElementById('modal-search'),
    prompts: document.getElementById('modal-prompts')
  };

  // Open buttons
  document.getElementById('btn-open-settings')?.addEventListener('click', () => modals.settings.classList.remove('hidden'));
  document.getElementById('btn-open-commands')?.addEventListener('click', () => {
    renderCommandManager();
    modals.commands.classList.remove('hidden');
  });
  document.getElementById('btn-open-debugger')?.addEventListener('click', () => {
    renderDebuggerLogs();
    modals.debugger.classList.remove('hidden');
  });
  document.getElementById('btn-open-export')?.addEventListener('click', () => modals.export.classList.remove('hidden'));
  document.getElementById('btn-open-search')?.addEventListener('click', () => modals.search.classList.remove('hidden'));
  document.getElementById('btn-open-prompts')?.addEventListener('click', () => {
    renderPromptsList();
    modals.prompts.classList.remove('hidden');
  });

  // Close buttons on all modals
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      Object.values(modals).forEach(m => m?.classList.add('hidden'));
    });
  });

  // --- Settings Form ---
  const settingApiUrl = document.getElementById('setting-api-url');
  const settingApiKey = document.getElementById('setting-api-key');
  const settingUserId = document.getElementById('setting-user-id');
  const settingTheme = document.getElementById('setting-theme');

  if (settingApiUrl) settingApiUrl.value = store.state.config.apiUrl;
  if (settingApiKey) settingApiKey.value = store.state.config.apiKey;
  if (settingUserId) settingUserId.value = store.state.config.userId;
  if (settingTheme) settingTheme.value = store.state.config.theme;

  document.getElementById('form-settings')?.addEventListener('submit', (e) => {
    e.preventDefault();
    store.state.config.apiUrl = settingApiUrl.value.trim();
    store.state.config.apiKey = settingApiKey.value.trim();
    store.state.config.userId = settingUserId.value.trim();
    store.state.config.theme = settingTheme.value;
    document.documentElement.setAttribute('data-theme', settingTheme.value);
    store.save();
    modals.settings.classList.add('hidden');
    store.addLog('info', 'Configuración de API actualizada');
  });

  // --- Command Manager Render & Logic ---
  function renderCommandManager() {
    const listEl = document.getElementById('command-manager-list');
    if (!listEl) return;
    listEl.innerHTML = store.state.customCommands.map((c, i) => `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs">
        <div>
          <span class="font-mono font-bold text-blue-400">${c.name}</span>
          <p class="text-neutral-400 mt-0.5">${escapeHtml(c.desc)}</p>
        </div>
        <button class="btn-del-custom-cmd p-1.5 hover:text-red-400 text-neutral-500" data-index="${i}">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
  }

  document.getElementById('form-add-command')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('new-cmd-name');
    const descInput = document.getElementById('new-cmd-desc');
    let name = nameInput.value.trim();
    if (!name.startsWith('/')) name = '/' + name;
    if (name) {
      store.state.customCommands.push({ name, desc: descInput.value.trim(), icon: 'terminal' });
      store.save();
      nameInput.value = '';
      descInput.value = '';
      renderCommandManager();
    }
  });

  document.addEventListener('click', (e) => {
    const delCmd = e.target.closest('.btn-del-custom-cmd');
    if (delCmd) {
      const idx = parseInt(delCmd.dataset.index, 10);
      store.state.customCommands.splice(idx, 1);
      store.save();
      renderCommandManager();
    }
  });

  // --- Prompt Gallery Render & Logic ---
  function renderPromptsList() {
    const listEl = document.getElementById('prompts-gallery-list');
    if (!listEl) return;
    listEl.innerHTML = store.state.promptTemplates.map((p) => `
      <div class="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs hover:border-white/10 transition-all">
        <div class="flex items-center justify-between mb-1.5">
          <span class="font-semibold text-white">${escapeHtml(p.title)}</span>
          <button class="btn-use-prompt px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-[11px]" data-text="${escapeHtml(p.text)}">
            Usar Prompt
          </button>
        </div>
        <p class="text-neutral-400 text-[11px] leading-relaxed">${escapeHtml(p.text)}</p>
      </div>
    `).join('');
  }

  document.addEventListener('click', (e) => {
    const usePrompt = e.target.closest('.btn-use-prompt');
    if (usePrompt) {
      chatInputEl.value = usePrompt.dataset.text;
      modals.prompts.classList.add('hidden');
      chatInputEl.focus();
    }
  });

  // --- Debugger Logs Render ---
  function renderDebuggerLogs() {
    const logsContainer = document.getElementById('debugger-logs-list');
    if (!logsContainer) return;
    if (store.state.logs.length === 0) {
      logsContainer.innerHTML = '<div class="text-neutral-500 text-center py-6">No hay registros aún</div>';
      return;
    }
    logsContainer.innerHTML = store.state.logs.map(log => {
      let badgeClass = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      if (log.type === 'error') badgeClass = 'text-red-400 bg-red-500/10 border-red-500/20';
      if (log.type === 'warn') badgeClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      if (log.type === 'sse') badgeClass = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      return `
        <div class="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] flex items-start space-x-2">
          <span class="px-1.5 py-0.5 rounded border ${badgeClass} text-[9px] uppercase shrink-0">${log.type}</span>
          <div class="flex-1 overflow-x-auto">
            <span class="text-neutral-400 mr-2">[${log.timestamp}]</span>
            <span class="text-neutral-200">${escapeHtml(log.message)}</span>
            ${log.details ? `<pre class="text-[10px] text-neutral-500 mt-1">${escapeHtml(JSON.stringify(log.details, null, 2))}</pre>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  document.getElementById('btn-clear-logs')?.addEventListener('click', () => {
    store.clearLogs();
    renderDebuggerLogs();
  });

  // --- Export Logic ---
  document.getElementById('btn-export-chat-md')?.addEventListener('click', () => {
    const chat = store.getActiveChat();
    if (!chat) return;
    let md = `# ${chat.title}\n\n*Fecha: ${new Date(chat.createdAt).toLocaleString()}*\n\n---\n\n`;
    chat.messages.forEach(m => {
      md += `### ${m.role === 'user' ? '👤 Usuario' : '🤖 Studio Agent'}\n${m.content}\n\n`;
    });
    downloadFile(`${chat.title.replace(/\s+/g, '_')}.md`, md, 'text/markdown');
  });

  document.getElementById('btn-export-chat-json')?.addEventListener('click', () => {
    const chat = store.getActiveChat();
    if (!chat) return;
    downloadFile(`${chat.title.replace(/\s+/g, '_')}.json`, JSON.stringify(chat, null, 2), 'application/json');
  });

  document.getElementById('btn-export-all-zip')?.addEventListener('click', async () => {
    if (!window.JSZip) {
      alert('Librería JSZip cargando...');
      return;
    }
    const zip = new JSZip();
    zip.file('studio_agent_workspace.json', JSON.stringify(store.state, null, 2));

    const chatsFolder = zip.folder('conversaciones');
    store.state.chats.forEach(c => {
      let md = `# ${c.title}\n\n`;
      c.messages.forEach(m => {
        md += `### ${m.role === 'user' ? 'Usuario' : 'Agente'}\n${m.content}\n\n`;
      });
      chatsFolder.file(`${c.id}_${c.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`, md);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StudioAgent_Backup_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  });

  function downloadFile(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Global Search Input ---
  const globalSearchInput = document.getElementById('search-input-global');
  const globalSearchResults = document.getElementById('search-results-global');
  if (globalSearchInput && globalSearchResults) {
    globalSearchInput.addEventListener('input', () => {
      const q = globalSearchInput.value.toLowerCase().trim();
      if (!q) {
        globalSearchResults.innerHTML = '<div class="text-neutral-500 text-center py-4 text-xs">Escribe para buscar...</div>';
        return;
      }

      const results = [];
      store.state.chats.forEach(chat => {
        if (chat.title.toLowerCase().includes(q)) {
          results.push({ chat, snippet: chat.title, matchType: 'Título' });
        }
        chat.messages.forEach(msg => {
          if (msg.content.toLowerCase().includes(q)) {
            const idx = msg.content.toLowerCase().indexOf(q);
            const start = Math.max(0, idx - 30);
            const snippet = msg.content.substring(start, start + 100);
            results.push({ chat, snippet: `...${snippet}...`, matchType: msg.role === 'user' ? 'Tú' : 'Agente' });
          }
        });
      });

      if (results.length === 0) {
        globalSearchResults.innerHTML = '<div class="text-neutral-500 text-center py-4 text-xs">No se encontraron resultados</div>';
        return;
      }

      globalSearchResults.innerHTML = results.slice(0, 10).map(r => `
        <div class="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer text-xs transition-all search-result-item" data-chat-id="${r.chat.id}">
          <div class="flex items-center justify-between text-neutral-400 mb-1">
            <span class="font-medium text-white">${escapeHtml(r.chat.title)}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">${r.matchType}</span>
          </div>
          <p class="text-neutral-400 text-[11px] truncate">${escapeHtml(r.snippet)}</p>
        </div>
      `).join('');
    });

    document.addEventListener('click', (e) => {
      const searchItem = e.target.closest('.search-result-item');
      if (searchItem) {
        const chatId = searchItem.dataset.chatId;
        store.state.activeChatId = chatId;
        store.save();
        modals.search.classList.add('hidden');
        renderSidebar();
        renderMessages();
      }
    });
  }

  // --- Canvas Controls ---
  document.getElementById('btn-close-canvas')?.addEventListener('click', () => canvas.close());
  document.getElementById('btn-device-desktop')?.addEventListener('click', () => canvas.setDevice('desktop'));
  document.getElementById('btn-device-tablet')?.addEventListener('click', () => canvas.setDevice('tablet'));
  document.getElementById('btn-device-mobile')?.addEventListener('click', () => canvas.setDevice('mobile'));

  document.getElementById('tab-btn-preview')?.addEventListener('click', () => { canvas.currentMode = 'preview'; canvas.updateTabs(); });
  document.getElementById('tab-btn-diff')?.addEventListener('click', () => { canvas.currentMode = 'diff'; canvas.updateTabs(); });
  document.getElementById('tab-btn-code')?.addEventListener('click', () => { canvas.currentMode = 'code'; canvas.updateTabs(); });
  document.getElementById('tab-btn-assets')?.addEventListener('click', () => { canvas.currentMode = 'assets'; canvas.updateTabs(); });

  function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial Renders
  renderSidebar();
  renderMessages();
  updateTokenCounter();
});
