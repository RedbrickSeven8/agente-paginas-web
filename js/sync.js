// Cloud Sync & Multi-device Context Engine
class CloudSyncService {
  constructor() {
    this.BASE_URL = 'https://api.restful-api.dev/objects';
    this.isSyncing = false;
    this.syncTimer = null;
    this.pollInterval = 5000;
  }

  getStorageKey(userId) {
    return 'studio_cloud_obj_' + (userId || 'studio_user_default');
  }

  getCloudId(userId) {
    return localStorage.getItem(this.getStorageKey(userId)) || null;
  }

  setCloudId(userId, id) {
    localStorage.setItem(this.getStorageKey(userId), id);
  }

  async pushState(state) {
    const userId = state.config.userId || 'studio_user_default';
    this.updateSyncBadge('Guardando en nube...', true);

    const payload = {
      name: `studio_workspace_${userId}`,
      data: {
        userId: userId,
        projects: state.projects,
        folders: state.folders,
        chats: state.chats,
        customCommands: state.customCommands,
        promptTemplates: state.promptTemplates,
        tags: state.tags,
        tokenUsage: state.tokenUsage,
        updatedAt: new Date().toISOString()
      }
    };

    let cloudId = this.getCloudId(userId);

    try {
      if (cloudId) {
        const updateRes = await fetch(`${this.BASE_URL}/${cloudId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (updateRes.ok) {
          this.updateSyncBadge('Sincronizado');
          return;
        }
      }

      // Create new Cloud Object for this user
      const createRes = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (createRes.ok) {
        const created = await createRes.json();
        this.setCloudId(userId, created.id);
        this.updateSyncBadge('Sincronizado');
      }
    } catch (err) {
      console.warn('Push sync error:', err);
      this.updateSyncBadge('Modo local');
    }
  }

  async pullState(userId, onMerge) {
    if (!userId) return;
    this.updateSyncBadge('Sincronizando...', true);

    try {
      let cloudId = this.getCloudId(userId);
      let remoteData = null;

      if (cloudId) {
        const res = await fetch(`${this.BASE_URL}/${cloudId}`);
        if (res.ok) {
          const obj = await res.json();
          if (obj && obj.data) remoteData = obj.data;
        }
      }

      if (remoteData && onMerge) {
        onMerge(remoteData);
        this.updateSyncBadge('Sincronizado');
      } else {
        this.updateSyncBadge('Sincronizado');
      }
    } catch (err) {
      console.warn('Pull sync error:', err);
      this.updateSyncBadge('Modo local');
    }
  }

  startPolling(getUserId, onRemoteUpdate) {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(async () => {
      const userId = getUserId();
      if (userId && !this.isSyncing) {
        this.isSyncing = true;
        await this.pullState(userId, onRemoteUpdate);
        this.isSyncing = false;
      }
    }, this.pollInterval);
  }

  updateSyncBadge(text, isSpinning = false) {
    const badge = document.getElementById('sync-status-indicator');
    if (badge) {
      badge.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-full ${isSpinning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}"></span>
        <span class="text-[10px] text-neutral-400 font-medium">${text}</span>
      `;
    }
  }
}

window.cloudSyncService = new CloudSyncService();
