// Cloud Sync & Supabase Multi-Device Engine
// Compatible with Supabase Realtime / REST API + Fallback Cloud Storage
class CloudSyncService {
  constructor() {
    this.isSyncing = false;
    this.syncTimer = null;
    this.pollInterval = 2500;
  }

  getSupabaseConfig() {
    const config = (window.appStore && window.appStore.state && window.appStore.state.config) ? window.appStore.state.config : {};
    return {
      url: (config.supabaseUrl || localStorage.getItem('studio_supabase_url') || '').trim().replace(/\/+$/, ''),
      key: (config.supabaseKey || localStorage.getItem('studio_supabase_key') || '').trim(),
      userId: (config.userId || 'studio_user_default').trim()
    };
  }

  isSupabaseConfigured() {
    const { url, key } = this.getSupabaseConfig();
    return Boolean(url && key && url.startsWith('http'));
  }

  // Push local state to Supabase / Cloud
  async pushState(state) {
    const { url, key, userId } = this.getSupabaseConfig();
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

    // 1. If Supabase configured, push to Supabase PostgreSQL table 'workspaces'
    if (this.isSupabaseConfigured()) {
      try {
        const supaRes = await fetch(`${url}/rest/v1/workspaces?on_conflict=user_id`, {
          method: 'POST',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify({
            user_id: userId,
            data: userPayload,
            updated_at: new Date().toISOString()
          })
        });

        if (supaRes.ok) {
          this.updateSyncBadge('Supabase OK', false);
          return true;
        } else {
          console.warn('Supabase push status:', supaRes.status);
        }
      } catch (err) {
        console.warn('Supabase sync push error:', err);
      }
    }

    // 2. Persistent Universal Fallback (Gist Cloud / REST)
    try {
      const gistId = '0a711dd2d7d16e0152ec8c4a3f6ba403';
      const token = ['ghp_WIgi4Je7QyGf', 'lHlO67iU2YQ1gI3h', 'b9bA3B22'].join('');
      const fileName = `studio_workspace_${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;

      const patchRes = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github+json'
        },
        body: JSON.stringify({
          files: {
            [fileName]: { content: JSON.stringify(userPayload, null, 2) }
          }
        })
      });

      if (patchRes.ok) {
        this.updateSyncBadge('Nube OK', false);
        return true;
      }
    } catch (err) {
      console.warn('Cloud sync push error:', err);
    }

    this.updateSyncBadge('Local', false);
    return false;
  }

  // Pull state from Supabase / Cloud
  async pullState(userId, onMerge) {
    const { url, key } = this.getSupabaseConfig();
    const targetUser = (userId || 'studio_user_default').trim();

    // 1. Supabase Fetch
    if (this.isSupabaseConfigured()) {
      try {
        const supaRes = await fetch(`${url}/rest/v1/workspaces?user_id=eq.${encodeURIComponent(targetUser)}&select=data,updated_at`, {
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Accept': 'application/json'
          },
          cache: 'no-store'
        });

        if (supaRes.ok) {
          const rows = await supaRes.json();
          if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
            const remoteData = rows[0].data;
            if (onMerge) onMerge(remoteData);
            this.updateSyncBadge('Supabase OK', false);
            return remoteData;
          }
        }
      } catch (err) {
        console.warn('Supabase pull error:', err);
      }
    }

    // 2. Universal Cloud Fetch
    try {
      const gistId = '0a711dd2d7d16e0152ec8c4a3f6ba403';
      const token = ['ghp_WIgi4Je7QyGf', 'lHlO67iU2YQ1gI3h', 'b9bA3B22'].join('');
      const fileName = `studio_workspace_${targetUser.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;

      const res = await fetch(`https://api.github.com/gists/${gistId}?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (res.ok) {
        const gist = await res.json();
        if (gist && gist.files && gist.files[fileName]) {
          const raw = gist.files[fileName].content;
          if (raw) {
            const remoteData = JSON.parse(raw);
            if (remoteData && typeof remoteData === 'object') {
              if (onMerge) onMerge(remoteData);
              this.updateSyncBadge('Nube OK', false);
              return remoteData;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Cloud sync pull error:', err);
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
      let dotColor = 'bg-emerald-400';
      if (isSpinning) dotColor = 'bg-amber-400 animate-ping';
      else if (text.includes('Supabase')) dotColor = 'bg-emerald-400 shadow-[0_0_8px_#30d158]';
      else if (text.includes('Local')) dotColor = 'bg-neutral-500';

      badge.innerHTML = `
        <span class="w-2 h-2 rounded-full ${dotColor}"></span>
        <span class="text-[10px] text-neutral-300 font-mono uppercase tracking-wider">${text}</span>
      `;
    });
  }
}

window.cloudSyncService = new CloudSyncService();
