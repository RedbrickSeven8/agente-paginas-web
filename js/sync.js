// Cloud Sync & Multi-device Context Engine
// Works seamlessly across iPhone, iPad, Android, macOS & Windows
class CloudSyncService {
  constructor() {
    this.HUB_OBJECT_ID = 'ff808181a09d98f701a0cb25b858739a';
    this.BASE_URL = 'https://api.restful-api.dev/objects';
    this.isSyncing = false;
    this.syncTimer = null;
    this.pollInterval = 3000;
  }

  // Push local user workspace to Cloud Hub
  async pushState(state) {
    const userId = (state && state.config && state.config.userId) ? state.config.userId.trim() : 'studio_user_default';
    this.updateSyncBadge('Sincronizando...', true);

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
      // 1. Fetch current global hub
      let currentHubData = { version: 2, users: {} };
      try {
        const getRes = await fetch(`${this.BASE_URL}/${this.HUB_OBJECT_ID}`, { cache: 'no-store' });
        if (getRes.ok) {
          const obj = await getRes.json();
          if (obj && obj.data && typeof obj.data === 'object') {
            currentHubData = obj.data;
            if (!currentHubData.users) currentHubData.users = {};
          }
        }
      } catch(e) {}

      // 2. Put user payload
      currentHubData.users[userId] = userPayload;

      // 3. Update Hub in Cloud
      const putRes = await fetch(`${this.BASE_URL}/${this.HUB_OBJECT_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'studio_workspace_hub_v1',
          data: currentHubData
        })
      });

      if (putRes.ok) {
        this.updateSyncBadge('Nube OK');
      } else {
        this.updateSyncBadge('Local');
      }
    } catch (err) {
      this.updateSyncBadge('Local');
    }
  }

  // Pull user workspace from Cloud Hub
  async pullState(userId, onMerge) {
    if (!userId) userId = 'studio_user_default';
    this.updateSyncBadge('Conectando...', true);

    try {
      const res = await fetch(`${this.BASE_URL}/${this.HUB_OBJECT_ID}?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const obj = await res.json();
        if (obj && obj.data && obj.data.users && obj.data.users[userId]) {
          const remoteData = obj.data.users[userId];
          if (onMerge) {
            onMerge(remoteData);
          }
          this.updateSyncBadge('Nube OK');
          return remoteData;
        }
      }
      this.updateSyncBadge('Nube OK');
    } catch (err) {
      this.updateSyncBadge('Local');
    }
    return null;
  }

  startPolling(getUserId, onRemoteUpdate) {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(async () => {
      const userId = getUserId() || 'studio_user_default';
      if (!this.isSyncing) {
        this.isSyncing = true;
        await this.pullState(userId, onRemoteUpdate);
        this.isSyncing = false;
      }
    }, this.pollInterval);
  }

  updateSyncBadge(text, isSpinning = false) {
    const badges = document.querySelectorAll('.sync-status-badge');
    badges.forEach(badge => {
      badge.innerHTML = `
        <span class="w-2 h-2 rounded-full ${isSpinning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}"></span>
        <span class="text-[10px] text-neutral-300 font-mono uppercase tracking-wider">${text}</span>
      `;
    });
  }
}

window.cloudSyncService = new CloudSyncService();
