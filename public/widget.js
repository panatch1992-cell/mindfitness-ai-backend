(function() {
  // --- [ZONE แก้ไขข้อมูลของคุณ] ---
  const API_URL = "https://mindfitness-ai-backend-4lfy.vercel.app/api/chat";
  
  // 1. ใส่ลิงก์ LINE หรือ Facebook ของคุณที่นี่
  const SOCIAL_LINK = "https://lin.ee/BUzH2xD"; 
  
  // 2. ใส่ลิงก์รูปโลโก้ของคุณที่นี่ (แทนที่ลิงก์ catbox)
  const AVATAR_URL = "https://files.catbox.moe/rdkdlq.jpg"; 
  
  const THEME_COLOR = "#007BFF"; 
  // -------------------------------

  const style = document.createElement('style');
  style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
    #mf-widget-container { position: fixed; bottom: 20px; right: 20px; z-index: 99999; font-family: 'Sarabun', sans-serif; }
    
    #mf-toggle-btn { width: 70px; height: 70px; border-radius: 50%; background-color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.2); cursor: pointer; border: none; padding: 0; overflow: hidden; transition: transform 0.2s; }
    #mf-toggle-btn:hover { transform: scale(1.05); }
    #mf-toggle-btn img { width: 100%; height: 100%; object-fit: cover; }
    
    #mf-chat-window { display: none; width: 380px; max-width: calc(100vw - 40px); height: 650px; max-height: 85vh; background: white; border-radius: 12px; box-shadow: 0 5px 30px rgba(0,0,0,0.25); flex-direction: column; overflow: hidden; position: absolute; bottom: 90px; right: 0; border: 1px solid #e0e0e0; }
    
    #mf-header { background: ${THEME_COLOR}; color: white; padding: 15px; font-weight: bold; font-size: 20px; display: flex; flex-direction: column; gap: 10px; }
    
    /* ส่วนบนของ Header: รูป + ชื่อ + ปุ่มต่างๆ */
    #mf-header-top { display: flex; align-items: center; width: 100%; }
    #mf-header img { width: 35px; height: 35px; border-radius: 50%; object-fit: cover; border: 2px solid white; margin-right: 8px; }
    
    #mf-bot-info { flex: 1; cursor: pointer; overflow: hidden; }
    #mf-bot-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; font-size: 18px;}
    
    /* กลุ่มปุ่มขวาบน */
    #mf-header-actions { display: flex; align-items: center; gap: 12px; }
    #mf-contact-btn, #mf-sound-btn, #mf-close-btn { background: none; border: none; cursor: pointer; font-size: 22px; color: white; opacity: 0.9; text-decoration: none; display: flex; align-items: center; padding: 0; }
    
    /* ส่วนล่าง Header: Dropdowns */
    #mf-controls { display: flex; gap: 5px; width: 100%; overflow-x: auto; padding-bottom: 2px; }
    #mf-controls::-webkit-scrollbar { display: none; } 

    .mf-select {
        background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4);
        border-radius: 15px; padding: 4px 8px; font-size: 12px; font-family: 'Sarabun', sans-serif;
        cursor: pointer; outline: none; white-space: nowrap; flex-shrink: 0;
    }
    .mf-select option { background: white; color: #333; }

    #mf-messages { flex: 1; padding: 15px; overflow-y: auto; background: #f0f8ff; display: flex; flex-direction: column; gap: 12px; }
    .mf-msg { max-width: 85%; padding: 12px 16px; border-radius: 16px; font-size: 18px; line-height: 1.5; word-wrap: break-word; }
    .mf-msg.user { align-self: flex-end; background: ${THEME_COLOR}; color: white; border-bottom-right-radius: 4px; }
    .mf-msg.bot { align-self: flex-start; background: #ffffff; color: #333; border: 1px solid #e0e0e0; border-bottom-left-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
    .mf-msg.system { align-self: center; background: #fff3cd; color: #856404; font-size: 14px; text-align: center; width: 95%; margin: 5px 0; border-radius: 8px; padding: 8px; }
    
    #mf-chips-area { padding: 10px 15px; background: #fff; border-top: 1px solid #f0f0f0; display: flex; flex-wrap: wrap; gap: 8px; }
    .mf-chip { background: #e7f1ff; color: #0056b3; border: 1px solid #b8daff; padding: 8px 14px; border-radius: 25px; font-size: 16px; cursor: pointer; transition: all 0.2s; user-select: none; }
    .mf-chip:hover { background: ${THEME_COLOR}; color: white; border-color: ${THEME_COLOR}; }

    #mf-input-area { padding: 12px; border-top: 1px solid #eee; display: flex; gap: 8px; background: white; align-items: center; }
    #mf-input { flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 30px; outline: none; font-size: 18px; }
    #mf-input:focus { border-color: ${THEME_COLOR}; }
    .mf-icon-btn { background: ${THEME_COLOR}; color: white; border: none; width: 42px; height: 42px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; transition: 0.2s; }
    #mf-mic-btn.listening { background: #dc3545; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
  `;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.id = 'mf-widget-container';
  container.innerHTML = `
    <div id="mf-chat-window">
      <div id="mf-header">
        <div id="mf-header-top">
            <img src="${AVATAR_URL}" alt="Avatar"> <div id="mf-bot-info" onclick="renameBot()">
                <span id="mf-bot-name">MINDBOT</span>
            </div>
            
            <div id="mf-header-actions">
                <a id="mf-contact-btn" href="${SOCIAL_LINK}" target="_blank" title="แอด LINE">👤</a>
                <button id="mf-sound-btn" title="เปิด/ปิดเสียง">🔇</button>
                <span id="mf-close-btn" title="ปิด">×</span>
            </div>
        </div>

        <div id="mf-controls">
            <select id="mf-dialect-select" class="mf-select" onchange="updateSettings()">
                <option value="central">ภาคกลาง</option>
                <option value="north">เหนือ</option>
                <option value="isan">อีสาน</option>
                <option value="south">ใต้</option>
            </select>
            <select id="mf-mbti-select" class="mf-select" onchange="updateSettings()">
                <option value="enfj">พี่หมอ (ENFJ)</option>
                <option value="infp">นักกวี (INFP)</option>
                <option value="intj">นักคิด (INTJ)</option>
                <option value="estp">สายลุย (ESTP)</option>
            </select>
            <select id="mf-exp-select" class="mf-select" onchange="updateSettings()">
                <option value="general">ทั่วไป</option>
                <option value="depression">เคยผ่านซึมเศร้า</option>
                <option value="anxiety">เคยผ่านวิตกกังวล</option>
                <option value="burnout">เคยหมดไฟ</option>
                <option value="relationship">เคยผ่านเรื่องรัก</option>
            </select>
        </div>
      </div>
      
      <div id="mf-messages">
        <div class="mf-msg bot">สวัสดีครับ ผม <b>MINDBOT</b> 🤖<br>วันนี้ใจเป็นยังไงบ้างครับ? เลือกโหมดเพื่อนคู่คิดด้านบนได้เลยนะครับ</div>
      </div>
      
      <div id="mf-chips-area">
        <span class="mf-chip" onclick="sendChip('เครียดเรื่องงาน/เรียน')">😓 เครียดงาน</span>
        <span class="mf-chip" onclick="sendChip('ความสัมพันธ์/ความรัก')">💔 ความรัก</span>
        <span class="mf-chip" onclick="sendChip('รู้สึกหมดไฟ (Burnout)')">🔋 หมดไฟ</span>
        <span class="mf-chip" onclick="sendChip('นอนไม่หลับ/คิดมาก')">🌙 นอนไม่หลับ</span>
        <span class="mf-chip" onclick="sendChip('แค่อยากระบายเฉยๆ')">🗣️ ระบาย</span>
      </div>

      <div id="mf-input-area">
        <input type="text" id="mf-input" placeholder="พิมพ์หรือกด 🎤 ...">
        <button id="mf-mic-btn" class="mf-icon-btn">🎤</button>
        <button id="mf-send-btn" class="mf-icon-btn">➤</button>
      </div>
    </div>
    
    <button id="mf-toggle-btn">
      <img src="${AVATAR_URL}" alt="Chat Logo"> </button>
  `;
  document.body.appendChild(container);

  let messageHistory = [];
  let isSoundOn = false; 
  const chatWindow = document.getElementById('mf-chat-window');
  const toggleBtn = document.getElementById('mf-toggle-btn');
  const closeBtn = document.getElementById('mf-close-btn');
  const input = document.getElementById('mf-input');
  const sendBtn = document.getElementById('mf-send-btn');
  const micBtn = document.getElementById('mf-mic-btn');
  const soundBtn = document.getElementById('mf-sound-btn');
  const msgContainer = document.getElementById('mf-messages');
  const dialectSelect = document.getElementById('mf-dialect-select');
  const mbtiSelect = document.getElementById('mf-mbti-select');
  const expSelect = document.getElementById('mf-exp-select');

  function speakText(text) {
    if (!isSoundOn) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH'; utterance.rate = 1.0; utterance.pitch = 1.0;    
    window.speechSynthesis.speak(utterance);
  }

  soundBtn.onclick = function() {
    isSoundOn = !isSoundOn;
    soundBtn.innerText = isSoundOn ? "🔊" : "🔇";
    // แจ้งเตือนสถานะเสียง
    appendMessage('system', isSoundOn ? "เปิดเสียงอ่านแล้วครับ" : "ปิดเสียงอ่านแล้วครับ");
  }

  window.updateSettings = function() {
    const dialectName = dialectSelect.options[dialectSelect.selectedIndex].text;
    const mbtiName = mbtiSelect.options[mbtiSelect.selectedIndex].text;
    const expName = expSelect.options[expSelect.selectedIndex].text;
    // แจ้งเตือนเมื่อเปลี่ยนค่า
    appendMessage('system', `🆗 เปลี่ยนโหมดเป็น: ${dialectName} + ${mbtiName} + ${expName}`);
  }

  // ... (ส่วน Voice Recognition เหมือนเดิม) ...
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'th-TH'; recognition.continuous = false; recognition.interimResults = false;
    recognition.onstart = function() { micBtn.classList.add('listening'); input.placeholder = "กำลังฟัง..."; };
    recognition.onend = function() { micBtn.classList.remove('listening'); input.placeholder = "..."; };
    recognition.onresult = function(event) { input.value = event.results[0][0].transcript; };
    micBtn.onclick = function() { if (micBtn.classList.contains('listening')) { recognition.stop(); } else { recognition.start(); } };
  } else { micBtn.style.display = 'none'; }

  function toggleChat() { chatWindow.style.display = chatWindow.style.display === 'flex' ? 'none' : 'flex'; }
  toggleBtn.onclick = toggleChat;
  closeBtn.onclick = toggleChat;

  function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `mf-msg ${role}`;
    div.innerHTML = text;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
    if (role === 'bot' && isSoundOn) { const plainText = text.replace(/<[^>]*>?/gm, ''); speakText(plainText); }
  }

  window.renameBot = function() {
    const currentName = document.getElementById('mf-bot-name').innerText;
    const newName = prompt("ตั้งชื่อเล่นให้ผมใหม่:", currentName);
    if (newName && newName.trim() !== "") {
        document.getElementById('mf-bot-name').innerText = newName;
        messageHistory.push({ role: "system", content: `[System] User renamed you to "${newName}".` });
        appendMessage('system', `เปลี่ยนชื่อเป็น "${newName}" เรียบร้อยครับ`);
    }
  }

  window.sendChip = function(text) { input.value = text; sendMessage(); }

  async function sendMessage() {
    const text = input.value.trim();
    const dialect = dialectSelect.value;
    const mbti = mbtiSelect.value;
    const experience = expSelect.value;
    
    if (!text) return;
    window.speechSynthesis.cancel();
    appendMessage('user', text);
    input.value = '';
    sendBtn.disabled = true;
    messageHistory.push({ role: "user", content: text });
    const chipsArea = document.getElementById('mf-chips-area');
    if(chipsArea) chipsArea.style.display = 'none';
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'mf-msg bot';
    loadingDiv.innerText = '...';
    loadingDiv.id = 'mf-loading';
    msgContainer.appendChild(loadingDiv);
    
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messageHistory, dialect, mbti, experience }) 
      });
      const data = await res.json();
      document.getElementById('mf-loading').remove();
      if (data.crisis) {
        appendMessage('system', "⚠️ หากรู้สึกไม่ไหว โปรดติดต่อ 1323");
        if (data.resources) data.resources.forEach(r => appendMessage('bot', `📞 ${r.name}: ${r.info}`));
      } else if (data.ai?.choices) {
        const reply = data.ai.choices[0].message.content;
        appendMessage('bot', reply);
        messageHistory.push({ role: "assistant", content: reply });
      } else {
        appendMessage('bot', "ระบบไม่ตอบสนอง");
      }
    } catch (err) {
      document.getElementById('mf-loading')?.remove();
      appendMessage('system', "เชื่อมต่อไม่ได้");
    }
    sendBtn.disabled = false;
  }
  sendBtn.onclick = sendMessage;
  input.onkeydown = (e) => { if(e.key==='Enter') sendMessage(); };
})();
