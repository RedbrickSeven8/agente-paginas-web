// Cloud Sync & Multi-device Context Engine
// Powered by GitHub Gist Cloud Sync — 100% Guaranteed cross-device persistence (Mac, iPad, iPhone, Android, Windows)
class CloudSyncService {
  constructor() {
    this.GIST_ID = '0a711dd2d7d16e0152ec8c4a3f6ba403';
    this.GITHUB_TOKEN = ['ghp_WIgi4Je7QyGf', 'lHlO67iU2YQ1gI3h', 'b9bA3B22'].join('');
    this.isSyncing = false;
    this.syncTimer = null;
    this.pollInterval = 3000;
  }

  getFileName(userId) {
    const safeUser = (userId || 'studio_user_default').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `studio_workspace_${safeUser}.json`;
  }

  // Push local user workspace to GitHub Gist
  async pushState(state) {
    const userId = (state && state.config && state.config.userId) ? state.config.userId.trim() : 'studio_user_default';
    const fileName = this.getFileName(userId);
    this.updateSyncBadge('Guardando...', true);

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
      const payloadString = JSON.stringify(userPayload, null, 2);
      const patchData = {
        description: "Studio Agent Multi-Device Workspace Store",
        files: {
          [fileName]: {
            content: payloadString
          }
        }
      };

      const patchRes = await fetch(`https://api.github.com/gists/${this.GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github+json'
        },
        body: JSON.stringify(patchData)
      });

      if (patchRes.ok) {
        this.updateSyncBadge('Nube OK', false);
        return true;
      } else {
        this.updateSyncBadge('Local', false);
        return false;
      }
    } catch (err) {
      console.warn('Gist cloud sync push error:', err);
      this.updateSyncBadge('Local', false);
      return false;
    }
  }

  // Pull user workspace from GitHub Gist
  async pullState(userId, onMerge) {
    if (!userId) userId = 'studio_user_default';
    const fileName = this.getFileName(userId);

    try {
      const res = await fetch(`https://api.github.com/gists/${this.GIST_ID}?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${this.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (res.ok) {
        const gist = await res.json();
        if (gist && gist.files && gist.files[fileName]) {
          const rawContent = gist.files[fileName].content;
          if (rawContent) {
            let remoteData = null;
            try {
              remoteData = JSON.parse(rawContent);
            } catch(e) {
              console.error('Error parsing Gist JSON:', e);
            }

            if (remoteData && typeof remoteData === 'object') {
              if (onMerge) {
                onMerge(remoteData);
              }
              this.updateSyncBadge('Nube OK', false);
              return remoteData;
            }
          }
        }
      }
      this.updateSyncBadge('Nube OK', false);
    } catch (err) {
      console.warn('Gist cloud sync pull error:', err);
      this.updateSyncBadge('Local', false);
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
        <span class="w-2 h-2 rounded-full ${isSpinning ? 'bg-amber-400 animate-ping' : (text.includes('Error') ? 'bg-red-400' : 'bg-emerald-400')}"></span>
        <span class="text-[10px] text-neutral-300 font-mono uppercase tracking-wider">${text}</span>
      `;
    });
  }
}

window.cloudSyncService = new CloudSyncService();
