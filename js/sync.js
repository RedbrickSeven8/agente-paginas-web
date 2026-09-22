// Cloud Sync & Multi-device Context Engine
class CloudSyncService {
  constructor() {
    this.HUB_OBJECT_ID = 'ff808181a09d98f701a0cb25b858739a';
    this.BASE_URL = 'https://api.restful-api.dev/objects';
    this.isSyncing = false;
    this.syncTimer = null;
    this.pollInterval = 4000; // Poll cloud every 4 seconds
    this.lastSyncedHash = '';
  }

  getHash(data) {
    try {
      return JSON.stringify(data);
    } catch(e) {
      return '';
    }
  }

  // Push local user workspace to the central shared cloud hub
  async pushState(state) {
    const userId = state.config.userId || 'studio_user_default';
    this.updateSyncBadge('Guardando en nube...', true);

    const userPayload = {
      projects: state.projects || [],
      folders: state.folders || [],
      chats: state.chats || [],
      customCommands: state.customCommands || [],
      promptTemplates: state.promptTemplates || [],
      tags: state.tags || [],
      tokenUsage: state.tokenUsage || { total: 0, limit: 128000 },
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Fetch current cloud state of all users
      let currentHubData = { version: 2, users: {} };
      const getRes = await fetch(`${this.BASE_URL}/${this.HUB_OBJECT_ID}`);
      if (getRes.ok) {
        const obj = await getRes.json();
        if (obj && obj.data && typeof obj.data === 'object') {
          currentHubData = obj.data;
          if (!currentHubData.users) currentHubData.users = {};
        }
      }

      // 2. Update current user slice
      currentHubData.users[userId] = userPayload;

      // 3. Put updated hub back to cloud
      const putRes = await fetch(`${this.BASE_URL}/${this.HUB_OBJECT_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'studio_workspace_hub_v1',
          data: currentHubData
        })
      });

      if (putRes.ok) {
        this.lastSyncedHash = this.getHash(userPayload);
        this.updateSyncBadge('Sincronizado');
      } else {
        this.updateSyncBadge('Error de red');
      }
    } catch (err) {
      console.warn('Sync push error:', err);
      this.updateSyncBadge('Modo local');
    }
  }

  // Pull user workspace from central shared cloud hub
  async pullState(userId, onMerge) {
    if (!userId) return;

    try {
      const res = await fetch(`${this.BASE_URL}/${this.HUB_OBJECT_ID}`);
      if (res.ok) {
        const obj = await res.json();
        if (obj && obj.data && obj.data.users && obj.data.users[userId]) {
          const remoteUserWorkspace = obj.data.users[userId];
          const newHash = this.getHash(remoteUserWorkspace);
          
          if (newHash !== this.lastSyncedHash) {
            this.lastSyncedHash = newHash;
            if (onMerge) onMerge(remoteUserWorkspace);
          }
          this.updateSyncBadge('Sincronizado');
          return;
        }
      }
      this.updateSyncBadge('Sincronizado');
    } catch (err) {
      console.warn('Sync pull error:', err);
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
        <span class="text-[10px] text-neutral-300 font-mono">${text}</span>
      `;
    }
  }
}

window.cloudSyncService = new CloudSyncService();
