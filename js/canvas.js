// Side View / Canvas & Multi-device Preview Manager
class CanvasManager {
  constructor() {
    this.isOpen = false;
    this.currentMode = 'preview'; // 'preview' | 'diff' | 'code' | 'assets'
    this.currentDevice = 'desktop'; // 'desktop' (100%), 'tablet' (768px), 'mobile' (375px)
    this.currentContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center justify-center p-6 text-center">
  <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
    <div class="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
    </div>
    <h1 class="text-xl font-bold mb-2 text-white">Side View Activo</h1>
    <p class="text-xs text-slate-400 mb-6 leading-relaxed">
      Previsualizador en tiempo real responsive. Puedes alternar vistas de Desktop, Tablet y Móvil (375px) o colapsar el panel cuando desees.
    </p>
    <div class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium">
      <span class="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
      <span>Listo para renderizar páginas</span>
    </div>
  </div>
</body>
</html>`;
    this.beforeImage = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
    this.afterImage = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80';
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.bindEvents();
      this.renderPreview(this.currentContent);
      this.setDevice(this.currentDevice);
    });
  }

  open(type = 'preview', payload = null) {
    this.isOpen = true;
    this.currentMode = type;
    const canvasEl = document.getElementById('side-canvas');
    const toggleBtn = document.getElementById('btn-toggle-side-view');
    
    if (canvasEl) {
      canvasEl.classList.remove('hidden');
      setTimeout(() => {
        canvasEl.classList.remove('translate-x-full');
      }, 10);
    }

    if (toggleBtn) {
      toggleBtn.classList.add('bg-blue-600/30', 'text-blue-300', 'border-blue-500/30');
      toggleBtn.classList.remove('text-neutral-300');
    }
    
    if (payload) {
      if (type === 'preview') {
        this.renderPreview(payload);
      } else if (type === 'code') {
        this.renderCode(payload.code, payload.lang || 'html');
      } else if (type === 'diff') {
        this.renderDiff(payload.before, payload.after);
      }
    }
    this.updateTabs();
  }

  close() {
    this.isOpen = false;
    const canvasEl = document.getElementById('side-canvas');
    const toggleBtn = document.getElementById('btn-toggle-side-view');
    
    if (canvasEl) {
      canvasEl.classList.add('translate-x-full');
      setTimeout(() => {
        if (!this.isOpen) canvasEl.classList.add('hidden');
      }, 300);
    }

    if (toggleBtn) {
      toggleBtn.classList.remove('bg-blue-600/30', 'text-blue-300', 'border-blue-500/30');
      toggleBtn.classList.add('text-neutral-300');
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(this.currentMode);
    }
  }

  setDevice(device) {
    this.currentDevice = device;
    const iframeWrapper = document.getElementById('canvas-iframe-wrapper');
    const deviceLabel = document.getElementById('current-device-label');
    const buttons = document.querySelectorAll('.device-btn');
    
    buttons.forEach(btn => {
      btn.classList.remove('bg-white/20', 'text-white', 'shadow');
      btn.classList.add('text-neutral-400');
    });

    if (iframeWrapper) {
      if (device === 'mobile') {
        iframeWrapper.style.width = '375px';
        iframeWrapper.style.maxWidth = '375px';
        iframeWrapper.style.height = '667px';
        iframeWrapper.style.maxHeight = '90%';
        if (deviceLabel) deviceLabel.textContent = 'Móvil (375px)';
      } else if (device === 'tablet') {
        iframeWrapper.style.width = '768px';
        iframeWrapper.style.maxWidth = '100%';
        iframeWrapper.style.height = '850px';
        iframeWrapper.style.maxHeight = '92%';
        if (deviceLabel) deviceLabel.textContent = 'Tablet (768px)';
      } else {
        iframeWrapper.style.width = '100%';
        iframeWrapper.style.maxWidth = '100%';
        iframeWrapper.style.height = '100%';
        iframeWrapper.style.maxHeight = '100%';
        if (deviceLabel) deviceLabel.textContent = 'Desktop (100%)';
      }
    }

    const activeBtn = document.getElementById(`btn-device-${device}`);
    if (activeBtn) {
      activeBtn.classList.add('bg-white/20', 'text-white', 'shadow');
      activeBtn.classList.remove('text-neutral-400');
    }
  }

  renderPreview(htmlOrUrl) {
    this.currentContent = htmlOrUrl;
    const frame = document.getElementById('canvas-preview-frame');
    if (!frame) return;

    if (typeof htmlOrUrl === 'string' && (htmlOrUrl.startsWith('http://') || htmlOrUrl.startsWith('https://'))) {
      frame.src = htmlOrUrl;
    } else {
      const blob = new Blob([htmlOrUrl], { type: 'text/html' });
      frame.src = URL.createObjectURL(blob);
    }
  }

  renderCode(code, lang = 'html') {
    const codeArea = document.getElementById('canvas-code-view');
    if (!codeArea) return;
    codeArea.innerHTML = `<pre><code class="language-${lang}">${this.escapeHtml(code)}</code></pre>`;
    if (window.hljs) hljs.highlightAll();
  }

  renderDiff(beforeUrl, afterUrl) {
    this.beforeImage = beforeUrl || this.beforeImage;
    this.afterImage = afterUrl || this.afterImage;
    const beforeEl = document.getElementById('diff-before-img');
    const afterEl = document.getElementById('diff-after-img');
    if (beforeEl) beforeEl.src = this.beforeImage;
    if (afterEl) afterEl.src = this.afterImage;
  }

  escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  updateTabs() {
    const tabs = ['preview', 'diff', 'code', 'assets'];
    tabs.forEach(t => {
      const tabBtn = document.getElementById(`tab-btn-${t}`);
      const section = document.getElementById(`canvas-section-${t}`);
      if (tabBtn) {
        if (t === this.currentMode) {
          tabBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white transition-all shadow-sm';
        } else {
          tabBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white transition-all';
        }
      }
      if (section) {
        section.classList.toggle('hidden', t !== this.currentMode);
      }
    });
  }

  bindEvents() {
    const sliderContainer = document.getElementById('diff-slider-container');
    const diffAfterWrapper = document.getElementById('diff-after-wrapper');
    const diffHandle = document.getElementById('diff-handle');

    if (sliderContainer && diffAfterWrapper && diffHandle) {
      let isDragging = false;

      const setSliderPosition = (x) => {
        const rect = sliderContainer.getBoundingClientRect();
        let pos = (x - rect.left) / rect.width;
        if (pos < 0) pos = 0;
        if (pos > 1) pos = 1;
        const percentage = pos * 100;
        diffAfterWrapper.style.clipPath = `polygon(${percentage}% 0, 100% 0, 100% 100%, ${percentage}% 100%)`;
        diffHandle.style.left = `${percentage}%`;
      };

      sliderContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        setSliderPosition(e.clientX);
      });
      window.addEventListener('mouseup', () => { isDragging = false; });
      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        setSliderPosition(e.clientX);
      });

      sliderContainer.addEventListener('touchstart', (e) => {
        isDragging = true;
        setSliderPosition(e.touches[0].clientX);
      }, { passive: true });
      window.addEventListener('touchend', () => { isDragging = false; });
      window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        setSliderPosition(e.touches[0].clientX);
      }, { passive: true });
    }
  }
}

window.canvasManager = new CanvasManager();
