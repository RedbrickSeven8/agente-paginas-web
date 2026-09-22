// Cloud Sync & Multi-device Context Engine
// Works seamlessly across iPhone, iPad, Android, macOS & Windows
class CloudSyncService {
  constructor() {
    this.HUB_OBJECT_ID = 'ff808181a09d98f701a0cb38f03773ae';
    this.BASE_URL = 'https://api.restful-api.dev/objects';
    this.isSyncing = false;
    this.syncTimer = null;
    this.pollInterval = 4000;
  }

  // Push local user workspace to Cloud Hub
  async pushState(state) {
    const rawUserId = (state && state.config && state.config.userId) ? state.config.userId.trim() : 'studio_user_default';
    const safeKey = 'user_' + rawUserId.replace(/[^a-zA-Z0-9_]/g, '_');
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
      const payloadString = JSON.stringify(userPayload);
      const patchData = {
        name: 'studio_agent_workspace_hub_v2',
        data: {
          [safeKey]: payloadString
        }
      };

      const patchRes = await fetch(`${this.BASE_URL}/${this.HUB_OBJECT_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchData)
      });

      if (patchRes.ok) {
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
    const safeKey = 'user_' + userId.replace(/[^a-zA-Z0-9_]/g, '_');
    this.updateSyncBadge('Conectando...', true);

    try {
      const res = await fetch(`${this.BASE_URL}/${this.HUB_OBJECT_ID}?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const obj = await res.json();
        if (obj && obj.data && obj.data[safeKey]) {
          let remoteData = obj.data[safeKey];
          if (typeof remoteData === 'string') {
            try {
              remoteData = JSON.parse(remoteData);
            } catch(e) {}
          }
          if (remoteData && typeof remoteData === 'object' && onMerge) {
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
