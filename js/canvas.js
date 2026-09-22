// Side-by-Side Canvas & Preview Inspector Manager
class CanvasManager {
  constructor() {
    this.isOpen = false;
    this.currentMode = 'preview'; // 'preview' | 'diff' | 'code' | 'assets'
    this.currentDevice = 'desktop'; // 'desktop' (100%), 'tablet' (768px), 'mobile' (375px)
    this.currentContent = '';
    this.beforeImage = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
    this.afterImage = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
    this.init();
  }

  init() {
    // Setup listeners after DOM loads
    document.addEventListener('DOMContentLoaded', () => {
      this.bindEvents();
    });
  }

  open(type = 'preview', payload = null) {
    this.isOpen = true;
    this.currentMode = type;
    const canvasEl = document.getElementById('side-canvas');
    if (canvasEl) {
      canvasEl.classList.remove('translate-x-full', 'hidden');
      canvasEl.classList.add('flex');
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
    if (canvasEl) {
      canvasEl.classList.add('translate-x-full');
      setTimeout(() => canvasEl.classList.add('hidden'), 300);
    }
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open(this.currentMode);
  }

  setDevice(device) {
    this.currentDevice = device;
    const iframeContainer = document.getElementById('canvas-iframe-wrapper');
    const buttons = document.querySelectorAll('.device-btn');
    buttons.forEach(btn => btn.classList.remove('bg-white/20', 'text-white', 'text-apple-blue'));

    if (iframeContainer) {
      iframeContainer.className = 'transition-all duration-300 mx-auto h-full bg-white rounded-xl shadow-2xl overflow-hidden';
      if (device === 'mobile') {
        iframeContainer.style.width = '375px';
        iframeContainer.style.maxHeight = '740px';
      } else if (device === 'tablet') {
        iframeContainer.style.width = '768px';
        iframeContainer.style.maxHeight = '900px';
      } else {
        iframeContainer.style.width = '100%';
        iframeContainer.style.maxHeight = '100%';
      }
    }

    const activeBtn = document.getElementById(`btn-device-${device}`);
    if (activeBtn) activeBtn.classList.add('bg-white/20', 'text-white');
  }

  renderPreview(htmlOrUrl) {
    this.currentContent = htmlOrUrl;
    const frame = document.getElementById('canvas-preview-frame');
    if (!frame) return;

    if (htmlOrUrl.startsWith('http://') || htmlOrUrl.startsWith('https://')) {
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
          tabBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white transition-all';
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
    // Diff Slider logic
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

      // Touch events
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
