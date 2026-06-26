(function () {
  const API_URL = '/api/chat';
  const MAX_HISTORY = 10;
  const ACCENT = '#1A4EFF';
  const WELCOME = 'VLCK 봇입니다 👋\n마케팅 서비스에 대해 궁금한 점을 물어보세요!';

  let history = [];
  let isOpen = false;

  /* ── styles ── */
  const style = document.createElement('style');
  style.textContent = `
    #vlck-chatbot * { box-sizing: border-box; margin: 0; padding: 0; }
    #vlck-chatbot { font-family: Pretendard, -apple-system, sans-serif; }

    #vlck-toggle {
      position: fixed; bottom: 28px; right: 28px; z-index: 9999;
      width: 58px; height: 58px; border-radius: 50%;
      background: ${ACCENT}; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 28px rgba(26,78,255,0.5);
      transition: transform .2s, box-shadow .2s;
    }
    #vlck-toggle:hover { transform: scale(1.08); box-shadow: 0 12px 36px rgba(26,78,255,0.6); }
    #vlck-toggle svg { width: 26px; height: 26px; fill: #fff; transition: opacity .15s; }

    #vlck-window {
      position: fixed; bottom: 100px; right: 28px; z-index: 9998;
      width: 380px; max-width: calc(100vw - 40px);
      height: 520px; max-height: calc(100vh - 140px);
      background: #141414; border: 1px solid rgba(255,255,255,0.09);
      border-radius: 20px; display: flex; flex-direction: column;
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,0.7);
      transform: translateY(20px) scale(0.96);
      opacity: 0; pointer-events: none;
      transition: transform .25s cubic-bezier(.22,1,.36,1), opacity .2s;
    }
    #vlck-window.open {
      transform: translateY(0) scale(1); opacity: 1; pointer-events: all;
    }

    #vlck-header {
      display: flex; align-items: center; gap: 11px;
      padding: 16px 18px; background: #1a1a1a;
      border-bottom: 1px solid rgba(255,255,255,0.07); flex-shrink: 0;
    }
    #vlck-avatar {
      width: 36px; height: 36px; border-radius: 10px;
      background: ${ACCENT}; display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
      box-shadow: 0 4px 14px rgba(26,78,255,0.45);
    }
    #vlck-header-info { flex: 1; }
    #vlck-header-name { font-size: 14px; font-weight: 700; color: #fff; }
    #vlck-header-status { font-size: 11px; color: #4ade80; display: flex; align-items: center; gap: 5px; margin-top: 2px; }
    #vlck-header-status::before {
      content: ''; width: 6px; height: 6px; border-radius: 50%; background: #4ade80;
    }
    #vlck-close {
      width: 30px; height: 30px; border-radius: 8px; border: none;
      background: rgba(255,255,255,0.07); color: #8a8a8a; cursor: pointer;
      font-size: 16px; display: flex; align-items: center; justify-content: center;
      transition: background .15s;
    }
    #vlck-close:hover { background: rgba(255,255,255,0.13); color: #fff; }

    #vlck-messages {
      flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;
      scroll-behavior: smooth;
    }
    #vlck-messages::-webkit-scrollbar { width: 4px; }
    #vlck-messages::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }

    .vlck-msg { display: flex; flex-direction: column; max-width: 85%; }
    .vlck-msg.bot { align-self: flex-start; }
    .vlck-msg.user { align-self: flex-end; }
    .vlck-bubble {
      padding: 11px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.6;
      word-break: break-word; white-space: pre-wrap;
    }
    .vlck-msg.bot .vlck-bubble {
      background: #1e1e1e; color: #e8e8e8; border-bottom-left-radius: 4px;
      border: 1px solid rgba(255,255,255,0.07);
    }
    .vlck-msg.user .vlck-bubble {
      background: ${ACCENT}; color: #fff; border-bottom-right-radius: 4px;
    }
    .vlck-msg.error .vlck-bubble {
      background: rgba(239,68,68,0.15); color: #fca5a5;
      border: 1px solid rgba(239,68,68,0.25); border-bottom-left-radius: 4px;
    }

    .vlck-dots { display: flex; gap: 4px; padding: 14px 16px; }
    .vlck-dots span {
      width: 7px; height: 7px; border-radius: 50%; background: #555;
      animation: vlck-dot .9s infinite;
    }
    .vlck-dots span:nth-child(2) { animation-delay: .15s; }
    .vlck-dots span:nth-child(3) { animation-delay: .3s; }
    @keyframes vlck-dot { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }

    #vlck-footer {
      padding: 12px 14px; border-top: 1px solid rgba(255,255,255,0.07);
      background: #1a1a1a; display: flex; gap: 10px; align-items: flex-end; flex-shrink: 0;
    }
    #vlck-input {
      flex: 1; background: #252525; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px; padding: 10px 14px; color: #fff; font-size: 13.5px;
      font-family: Pretendard, -apple-system, sans-serif; resize: none;
      outline: none; line-height: 1.5; max-height: 100px; min-height: 42px;
      transition: border-color .15s;
    }
    #vlck-input:focus { border-color: rgba(26,78,255,0.5); }
    #vlck-input::placeholder { color: #555; }
    #vlck-send {
      width: 42px; height: 42px; border-radius: 12px; border: none;
      background: ${ACCENT}; cursor: pointer; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
      transition: opacity .15s, transform .15s;
      box-shadow: 0 4px 14px rgba(26,78,255,0.4);
    }
    #vlck-send:hover { opacity: .88; transform: scale(1.04); }
    #vlck-send:disabled { opacity: .4; cursor: default; transform: none; }
    #vlck-send svg { width: 18px; height: 18px; fill: #fff; }

    @media (max-width: 480px) {
      #vlck-window { right: 20px; bottom: 90px; }
      #vlck-toggle { right: 20px; bottom: 20px; }
    }
  `;
  document.head.appendChild(style);

  /* ── DOM ── */
  const root = document.createElement('div');
  root.id = 'vlck-chatbot';
  root.innerHTML = `
    <button id="vlck-toggle" aria-label="채팅 상담">
      <svg id="vlck-icon-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      <svg id="vlck-icon-close" viewBox="0 0 24 24" style="display:none"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </button>
    <div id="vlck-window" role="dialog" aria-label="VLCK 상담 채팅">
      <div id="vlck-header">
        <div id="vlck-avatar">🤖</div>
        <div id="vlck-header-info">
          <div id="vlck-header-name">VLCK 봇</div>
          <div id="vlck-header-status">온라인</div>
        </div>
        <button id="vlck-close" aria-label="닫기">✕</button>
      </div>
      <div id="vlck-messages"></div>
      <div id="vlck-footer">
        <textarea id="vlck-input" placeholder="메시지를 입력하세요…" rows="1"></textarea>
        <button id="vlck-send" aria-label="전송">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  /* ── refs ── */
  const toggle   = document.getElementById('vlck-toggle');
  const win      = document.getElementById('vlck-window');
  const closeBtn = document.getElementById('vlck-close');
  const messages = document.getElementById('vlck-messages');
  const input    = document.getElementById('vlck-input');
  const send     = document.getElementById('vlck-send');
  const iconChat = document.getElementById('vlck-icon-chat');
  const iconX    = document.getElementById('vlck-icon-close');

  /* ── helpers ── */
  function scrollBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `vlck-msg ${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'vlck-bubble';
    bubble.textContent = text;
    div.appendChild(bubble);
    messages.appendChild(div);
    scrollBottom();
    return div;
  }

  function showLoading() {
    const div = document.createElement('div');
    div.className = 'vlck-msg bot';
    div.id = 'vlck-loading';
    div.innerHTML = `<div class="vlck-dots"><span></span><span></span><span></span></div>`;
    messages.appendChild(div);
    scrollBottom();
  }

  function removeLoading() {
    const el = document.getElementById('vlck-loading');
    if (el) el.remove();
  }

  function setLocked(lock) {
    input.disabled = lock;
    send.disabled = lock;
  }

  function autoResize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  }

  /* ── open / close ── */
  function openChat() {
    isOpen = true;
    win.classList.add('open');
    iconChat.style.display = 'none';
    iconX.style.display = '';
    input.focus();
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
    iconChat.style.display = '';
    iconX.style.display = 'none';
  }

  toggle.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);

  /* ── send message ── */
  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.style.height = '';
    addMessage('user', text);

    history.push({ role: 'user', content: text });
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

    setLocked(true);
    showLoading();

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();
      removeLoading();

      if (!res.ok || data.error) {
        const err = addMessage('bot', '');
        err.classList.add('error');
        err.querySelector('.vlck-bubble').textContent = data.error || '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      } else {
        addMessage('bot', data.reply);
        history.push({ role: 'assistant', content: data.reply });
        if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
      }
    } catch {
      removeLoading();
      const err = addMessage('bot', '');
      err.classList.add('error');
      err.querySelector('.vlck-bubble').textContent = '연결에 실패했습니다. 네트워크를 확인해 주세요.';
    } finally {
      setLocked(false);
      input.focus();
    }
  }

  send.addEventListener('click', sendMessage);
  input.addEventListener('input', autoResize);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  /* ── welcome ── */
  setTimeout(() => {
    addMessage('bot', WELCOME);
    openChat();
  }, 1000);
})();
