// Dify API Client & SSE Stream Manager
class DifyService {
  constructor() {
    this.abortController = null;
  }

  getConfig() {
    return window.appStore.state.config;
  }

  async uploadFile(file) {
    const config = this.getConfig();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user', config.userId);

    window.appStore.addLog('api', `Subiendo archivo: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

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
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      const result = await response.json();
      window.appStore.addLog('info', `Archivo subido con éxito ID: ${result.id}`);
      return result;
    } catch (err) {
      window.appStore.addLog('error', `Fallo al subir archivo: ${err.message}`, err);
      throw err;
    }
  }

  async sendMessage({ query, files = [], chatId, onChunk, onThought, onToolCall, onComplete, onError }) {
    const config = this.getConfig();
    const chat = window.appStore.state.chats.find(c => c.id === chatId);
    const conversationId = chat ? chat.difyConversationId : '';

    // Shared Project context
    let projectContextNote = '';
    if (chat && chat.projectId) {
      const project = window.appStore.state.projects.find(p => p.id === chat.projectId);
      if (project) {
        const otherChats = window.appStore.state.chats.filter(c => c.projectId === chat.projectId && c.id !== chat.id);
        if (otherChats.length > 0) {
          projectContextNote = `[Contexto del Proyecto "${project.name}": Este proyecto incluye ${otherChats.length} conversaciones relacionadas. Mantén coherencia y continuidad].\n`;
        }
      }
    }

    const payload = {
      inputs: {},
      query: query,
      response_mode: 'streaming',
      conversation_id: conversationId || undefined,
      user: config.userId,
      files: files.map(f => ({
        type: f.type.startsWith('image') ? 'image' : 'document',
        transfer_method: 'local_file',
        upload_file_id: f.id
      }))
    };

    this.abortController = new AbortController();
    window.appStore.addLog('api', `Enviando mensaje a Dify API (Conv ID: ${conversationId || 'Nueva'})`);

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
        const errText = await response.text();
        let errMsg = `Error ${response.status}: ${response.statusText}`;
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.message || errMsg;
        } catch(e){}
        throw new Error(errMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedContent = '';
      let accumulatedThought = '';
      let activeTools = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep last incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.substring(5).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            const event = data.event;

            if (event === 'message' || event === 'agent_message') {
              const chunk = data.answer || '';
              accumulatedContent += chunk;
              if (onChunk) onChunk(accumulatedContent, chunk);
            } else if (event === 'agent_thought') {
              const thought = data.thought || '';
              accumulatedThought += thought;
              const tool = data.tool;
              if (tool && !activeTools.includes(tool)) {
                activeTools.push(tool);
                window.appStore.addLog('sse', `Herramienta invocada: ${tool}`);
              }
              if (onThought) onThought(accumulatedThought, tool, data.tool_input);
            } else if (event === 'message_file') {
              window.appStore.addLog('info', `Archivo generado por el agente: ${data.url || data.id}`);
            } else if (event === 'message_end') {
              // Update conversation id if new
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
      if (onComplete) onComplete(accumulatedContent, accumulatedThought, activeTools);
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
    }
  }

  stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

window.difyService = new DifyService();
