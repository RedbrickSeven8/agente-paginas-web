// Dify API Client & SSE Stream Manager
class DifyService {
  constructor() {
    this.abortController = null;
  }

  getConfig() {
    return window.appStore.state.config;
  }

  // Helper centralizado para resolver MIME types precisos en cualquier tipo de archivo
  getMimeType(fileName, declaredType) {
    if (declaredType && declaredType.trim() !== '' && declaredType !== 'application/octet-stream') {
      return declaredType;
    }
    const ext = (fileName || '').split('.').pop().toLowerCase();
    const mimeMap = {
      // Imágenes (todos los formatos incluidos .jpeg, .jpg, .png, etc.)
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'ico': 'image/x-icon',
      'avif': 'image/avif',
      'tif': 'image/tiff',
      'tiff': 'image/tiff',
      'heic': 'image/heic',
      'heif': 'image/heif',
      // Documentos y texto
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'md': 'text/markdown',
      'mdx': 'text/markdown',
      'json': 'application/json',
      'csv': 'text/csv',
      'html': 'text/html',
      'htm': 'text/html',
      'css': 'text/css',
      'scss': 'text/x-scss',
      'js': 'application/javascript',
      'mjs': 'application/javascript',
      'ts': 'application/typescript',
      'tsx': 'application/typescript',
      'jsx': 'application/javascript',
      'py': 'text/x-python',
      'sh': 'application/x-sh',
      'sql': 'application/sql',
      'xml': 'application/xml',
      'yaml': 'application/x-yaml',
      'yml': 'application/x-yaml',
      'zip': 'application/zip',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'm4a': 'audio/mp4',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'webm': 'video/webm'
    };
    return mimeMap[ext] || 'application/octet-stream';
  }

  isImageFile(fileName, mimeType) {
    const mime = (mimeType || '').toLowerCase();
    const name = (fileName || '').toLowerCase();
    return mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp|ico|avif|tiff?|heic|heif)$/i.test(name);
  }

  async uploadFile(file, overrideUserId = null) {
    const config = this.getConfig();
    const effectiveUser = overrideUserId || config.userId || 'Dani';

    const normalizedMime = this.getMimeType(file.name, file.type);
    let uploadPayloadFile = file;

    // Si el archivo original no tiene el MIME correcto (ej. JPEG sin type o application/octet-stream),
    // creamos un File con el MIME exacto para garantizar compatibilidad con validadores Dify y LLM
    if (typeof File !== 'undefined' && (!file.type || file.type === 'application/octet-stream' || file.type !== normalizedMime)) {
      try {
        uploadPayloadFile = new File([file], file.name || 'archivo', { type: normalizedMime });
      } catch (e) {
        uploadPayloadFile = file;
      }
    }

    const formData = new FormData();
    formData.append('file', uploadPayloadFile, file.name || 'archivo');
    formData.append('user', effectiveUser);

    window.appStore.addLog('api', `Subiendo archivo: ${file.name} (${(file.size / 1024).toFixed(1)} KB, MIME: ${normalizedMime}, User: ${effectiveUser})`);

    try {
      const response = await fetch(`${config.apiUrl}/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.message || errorData.error || `HTTP error ${response.status}: ${response.statusText}`;
        throw new Error(msg);
      }

      const result = await response.json();
      window.appStore.addLog('info', `Archivo subido con éxito ID: ${result.id} (${file.name})`);
      return result;
    } catch (err) {
      window.appStore.addLog('error', `Fallo al subir archivo ${file.name}: ${err.message}`, err);
      throw err;
    }
  }

  // Helper para formatear y humanizar comandos y herramientas del agente
  humanizeAction(tool, toolInput, thought) {
    let title = 'Procesando acción...';
    let detail = '';
    let icon = 'sparkles';
    let type = 'general';

    const toolName = (tool || '').toLowerCase();
    let inputStr = '';
    if (typeof toolInput === 'string') {
      inputStr = toolInput;
    } else if (toolInput && typeof toolInput === 'object') {
      inputStr = toolInput.script || toolInput.command || toolInput.query || toolInput.prompt || toolInput.url || JSON.stringify(toolInput);
    }

    if (toolName.includes('shell') || toolName.includes('bash') || toolName.includes('exec') || toolName.includes('terminal')) {
      type = 'shell';
      icon = 'terminal';
      if (inputStr.includes('surge')) {
        title = '🚀 Desplegando en vivo en Surge.sh';
        detail = 'Subiendo archivos compilados y configurando dominio...';
      } else if (inputStr.includes('git push') || inputStr.includes('git commit')) {
        title = '📦 Sincronizando repositorio en GitHub';
        detail = 'Guardando commits y subiendo rama main...';
      } else if (inputStr.includes('curl') || inputStr.includes('wget') || inputStr.includes('http')) {
        title = '🌐 Conectando y descargando recursos web';
        detail = inputStr.substring(0, 100);
      } else if (inputStr.includes('cat') || inputStr.includes('mkdir') || inputStr.includes('touch') || inputStr.includes('ls')) {
        title = '📁 Estructurando archivos y carpetas';
        detail = inputStr.substring(0, 90);
      } else if (inputStr.includes('node') || inputStr.includes('python') || inputStr.includes('pnpm') || inputStr.includes('npm')) {
        title = '⚙️ Ejecutando scripts de compilación y lógica';
        detail = inputStr.substring(0, 90);
      } else {
        title = '⚡ Ejecutando comando de consola';
        detail = inputStr ? inputStr.substring(0, 100) : 'Procesando en workspace sandbox...';
      }
    } else if (toolName.includes('image') || toolName.includes('vertex') || toolName.includes('gemini')) {
      type = 'image';
      icon = 'image';
      title = '🎨 Generando / Editando assets visuales e imágenes';
      detail = inputStr ? `Prompt: ${inputStr.substring(0, 100)}` : 'Procesando con modelo de diseño...';
    } else if (toolName.includes('web') || toolName.includes('search') || toolName.includes('scrape') || toolName.includes('fetch')) {
      type = 'network';
      icon = 'globe';
      title = '🔍 Consultando recursos y enlaces externos';
      detail = inputStr.substring(0, 100);
    } else if (toolName.includes('design') || toolName.includes('taste')) {
      type = 'design';
      icon = 'palette';
      title = '✨ Diseñando interfaz y tokens UI/UX';
      detail = 'Aplicando estética moderna, contraste y layout responsive...';
    } else if (tool) {
      title = `Herramienta: ${tool}`;
      detail = inputStr.substring(0, 100);
    } else if (thought) {
      title = 'Pensando y planificando arquitectura...';
      detail = thought.substring(0, 120);
    }

    return { title, detail, rawTool: tool, rawInput: inputStr, icon, type };
  }

  async sendMessage({ query, files = [], chatId, onChunk, onThought, onToolCall, onComplete, onError }) {
    const config = this.getConfig();
    const chat = window.appStore.state.chats.find(c => c.id === chatId);
    const project = chat && chat.projectId ? window.appStore.state.projects.find(p => p.id === chat.projectId) : null;
    const folder = chat && chat.folderId ? window.appStore.state.folders.find(f => f.id === chat.folderId) : null;
    const conversationId = (chat && chat.difyConversationId) ? chat.difyConversationId : '';

    // Isolated user identifier per chat to guarantee Dify memory isolation across different chats and folders
    const chatUserId = `${config.userId || 'Dani'}_${chatId}`;

    // Process and ensure valid upload IDs for any pending files using chatUserId
    const validDifyFiles = [];
    for (const f of files) {
      let uploadId = f.id;
      if (!uploadId && f.fileRef) {
        try {
          const up = await this.uploadFile(f.fileRef, chatUserId);
          uploadId = up.id;
        } catch (e) {
          window.appStore.addLog('warn', `No se pudo subir archivo a Dify: ${f.name}`);
        }
      }
      if (uploadId) {
        const isImg = this.isImageFile(f.name, f.type);
        validDifyFiles.push({
          type: isImg ? 'image' : 'document',
          transfer_method: 'local_file',
          upload_file_id: uploadId
        });
      }
    }

    const payload = {
      inputs: {
        chat_title: chat ? (chat.title || 'Conversación') : '',
        project_name: project ? project.name : 'General',
        folder_name: folder ? folder.name : 'Sin Carpeta'
      },
      query: query,
      response_mode: 'streaming',
      conversation_id: conversationId || undefined,
      user: chatUserId,
      files: validDifyFiles
    };

    this.abortController = new AbortController();
    this.currentReader = null;
    this.currentTaskId = null;
    this.isStopped = false;
    window.appStore.addLog('api', `Enviando mensaje a Dify API (Conv ID: ${conversationId || 'Nueva'}, Adjuntos: ${validDifyFiles.length})`);

    // Pausar sincronización periódica mientras el agente está actuando para evitar interrupciones
    if (window.cloudSyncService && typeof window.cloudSyncService.pauseSync === 'function') {
      window.cloudSyncService.pauseSync();
    }

    try {
      const response = await fetch(`${config.apiUrl}/chat-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.message || errorData.error || `HTTP error ${response.status}: ${response.statusText}`;
        throw new Error(msg);
      }

      const reader = response.body.getReader();
      this.currentReader = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      let accumulatedContent = '';
      let accumulatedThought = '';
      let stepsHistory = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep unfinished line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const jsonStr = trimmed.substring(5).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            const event = data.event;

            if (data.task_id) {
              this.currentTaskId = data.task_id;
            }

            if (event === 'agent_message' || event === 'message') {
              const textChunk = data.answer || '';
              accumulatedContent += textChunk;
              if (onChunk) onChunk(accumulatedContent, textChunk);
            } else if (event === 'agent_thought') {
              const thought = data.thought || '';
              const tool = data.tool || '';
              const toolInput = data.tool_input || '';

              if (thought) {
                accumulatedThought += (accumulatedThought ? '\n' : '') + thought;
              }

              const action = this.humanizeAction(tool, toolInput, thought);
              
              if (tool || thought) {
                // Registrar paso enriquecido
                const existingStep = stepsHistory.find(s => s.tool === tool && s.input === action.rawInput);
                if (!existingStep) {
                  stepsHistory.push({
                    title: action.title,
                    detail: action.detail,
                    tool: tool,
                    input: action.rawInput,
                    icon: action.icon,
                    type: action.type,
                    thought: thought,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  });
                }
                window.appStore.addLog('sse', `${action.title}: ${action.detail || tool}`);
              }

              if (onThought) onThought(accumulatedThought, action, stepsHistory);
            } else if (event === 'message_file') {
              window.appStore.addLog('info', `Archivo generado por el agente: ${data.url || data.id}`);
            } else if (event === 'message_end') {
              if (data.conversation_id && chat) {
                window.appStore.updateChat(chatId, { difyConversationId: data.conversation_id });
              }
              if (data.metadata && data.metadata.usage) {
                window.appStore.state.tokenUsage.total += data.metadata.usage.total_tokens || 0;
                window.appStore.save();
              }
            } else if (event === 'error') {
              window.appStore.addLog('error', `Error recibido en stream Dify: ${data.message}`);
              if (onError) onError(new Error(data.message));
            }
          } catch (jsonErr) {
            console.warn('Error parsing SSE json chunk:', jsonErr, jsonStr);
          }
        }
      }

      window.appStore.addLog('sse', 'Stream completado exitosamente.');
      if (onComplete) onComplete(accumulatedContent, accumulatedThought, stepsHistory);
    } catch (err) {
      if (err.name === 'AbortError') {
        window.appStore.addLog('warn', 'Generación detenida por el usuario.');
        if (onComplete) onComplete(accumulatedContent || 'Generación detenida.', '', []);
      } else {
        window.appStore.addLog('error', `Fallo de conexión Dify: ${err.message}`, err);
        if (onError) onError(err);
      }
    } finally {
      this.abortController = null;
      this.currentReader = null;
      this.currentTaskId = null;
      this.isStopped = false;
      // Reanudar sincronización periódica una vez finalizada la respuesta
      if (window.cloudSyncService && typeof window.cloudSyncService.resumeSync === 'function') {
        window.cloudSyncService.resumeSync();
      }
    }
  }

  async stop() {
    this.isStopped = true;

    // 1. Abort fetch controller
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch (e) {
        console.warn('Error aborting request:', e);
      }
      this.abortController = null;
      window.appStore.addLog('warn', 'Generación cancelada manualmente.');
    }

    // 2. Cancel body stream reader
    if (this.currentReader) {
      try {
        await this.currentReader.cancel();
      } catch (e) {}
      this.currentReader = null;
    }

    // 3. Optional backend task cancellation
    if (this.currentTaskId) {
      const config = this.getConfig();
      try {
        fetch(`${config.apiUrl}/chat-messages/${this.currentTaskId}/stop`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ user: config.userId || 'Dani' })
        }).catch(() => {});
      } catch (e) {}
      this.currentTaskId = null;
    }

    // Reanudar sincronización al detener manualmente
    if (window.cloudSyncService && typeof window.cloudSyncService.resumeSync === 'function') {
      window.cloudSyncService.resumeSync();
    }
  }
}

window.difyService = new DifyService();
