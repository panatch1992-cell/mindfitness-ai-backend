(function() {
  const API_URL = "https://mindfitness-ai-backend-4lfy.vercel.app/api/chat"; // เช็ค URL ให้ตรง

  // --- [Config] ใส่ลิงก์ Social Media ของคุณตรงนี้ ---
  const SOCIAL_LINK = "https://lin.ee/BUzH2xD"; // เปลี่ยนเป็นลิงก์ LINE OA ของคุณ
  // ------------------------------------------------

  const style = document.createElement('style');
  style.innerHTML = `
    #mf-widget-container { position: fixed; bottom: 20px; right: 20px; z-index: 99999; font-family: 'Sarabun', sans-serif; }
    
    #mf-toggle-btn { width: 65px; height: 65px; border-radius: 50%; background-color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.2); cursor: pointer; border: none; padding: 0; overflow: hidden; transition: transform 0.2s; }
    #mf-toggle-btn:hover { transform: scale(1.05); }
    #mf-toggle-btn img { width: 100%; height: 100%; object-fit: cover; }

    #mf-chat-window { display: none; width: 350px; height: 500px; background: white; border-radius: 12px; box-shadow: 0 5px 25px rgba(0,0,0,0.2); flex-direction: column; overflow: hidden; position: absolute; bottom: 85px; right: 0; border: 1px solid #eee; }
    
    #mf-header { background: #6A4BFF; color: white; padding: 15px; font-weight: bold; display: flex; align-items: center; gap: 8px; }
    #mf-header img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid white; }
    
    #mf-bot-info { flex: 1; display: flex; align-items: center; gap: 5px; cursor: pointer; overflow: hidden; }
    #mf-bot-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;}
    #mf-edit-icon { font-size: 12px; opacity: 0.7; }
    
    /* ปุ่ม Social / Contact */
    #mf-contact-btn { background: none; border: none; cursor: pointer; font-size: 18px; color: white; opacity: 0.9; transition: 0.2s; text-decoration: none; display: flex; align-items: center; }
    #mf-contact-btn:hover { transform: scale(1.1); }
    
    #mf-sound-btn { background: none; border: none; cursor: pointer; font-size: 18px; color: white; opacity: 0.7; transition: 0.2s; margin-right: 5px; }
    #mf-sound-btn.active { opacity: 1; text-shadow: 0 0 5px rgba(255,255,255,0.8); }

    #mf-messages { flex: 1; padding: 15px; overflow-y: auto; background: #f8f9fa; display: flex; flex-direction: column; gap: 10px; }
    .mf-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
    .mf-msg.user { align-self: flex-end; background: #6A4BFF; color: white; border-bottom-right-radius: 2px; }
    .mf-msg.bot { align-self: flex-start; background: #E9ECEF; color: #333; border-bottom-left-radius: 2px; }
    .mf-msg.system { align-self: center; background: #ffeeba; color: #856404; font-size: 12px; text-align: center; width: 95%; margin: 5px 0; }
    
    #mf-chips-area { padding: 10px 15px; background: #fff; border-top: 1px solid #f0f0f0; display: flex; flex-wrap: wrap; gap: 8px; }
    .mf-chip { background: #f1f3f5; color: #495057; border: 1px solid #dee2e6; padding: 6px 12px; border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.2s; user-select: none; }
    .mf-chip:hover { background: #6A4BFF; color: white; border-color: #6A4BFF; }

    #mf-input-area { padding: 12px; border-top: 1px solid #eee; display: flex; gap: 8px; background: white; align-items: center; }
    #mf-input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 20px; outline: none; font-size: 14px; }
    #mf-input:focus { border-color: #6A4BFF; }
    
    .mf-icon-btn { background: #6A4BFF; color: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: 0.2s; }
    .mf-icon-btn:disabled { background: #ccc; cursor: not-allowed; }
    #mf-mic-btn.listening { background: #dc3545; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
  `;
  document.head.appendChild(style);

  // 2. Inject HTML
  const container = document.createElement('div');
  container.id = 'mf-widget-container';
  container.innerHTML = `
    <div id="mf-chat-window">
      <div id="mf-header">
        <img src=""https://files.catbox.moe/rdkdlq.jpg" alt="Avatar">
        
        <div id="mf-bot-info" onclick="renameBot()" title="คลิกเพื่อเปลี่ยนชื่อ">
            <span id="mf-bot-name">MindFitness</span>
            <span id="mf-edit-icon">✏️</span>
        </div>
        
        <a id="mf-contact-btn" href="${SOCIAL_LINK}" target="_blank" title="ติดต่อเรา / แอด LINE">
           👤
        </a>

        <button id="mf-sound-btn" title="เปิด/ปิดเสียงอ่าน">🔇</button>
        
        <span style="cursor:pointer; font-size:18px; margin-left:5px;" id="mf-close-btn">×</span>
      </div>
      
      <div id="mf-messages">
        <div class="mf-msg bot">สวัสดีครับ ผมคือเพื่อนรับฟังของคุณ 😊<br>วันนี้ใจเป็นยังไงบ้างครับ?</div>
      </div>
      
      <div id="mf-chips-area">
        <span class="mf-chip" onclick="sendChip('เครียดเรื่องงาน/เรียน')">😓 เครียดงาน/เรียน</span>
        <span class="mf-chip" onclick="sendChip('ความสัมพันธ์/ความรัก')">💔 ความรัก/ครอบครัว</span>
        <span class="mf-chip" onclick="sendChip('รู้สึกหมดไฟ (Burnout)')">🔋 รู้สึกหมดไฟ</span>
        <span class="mf-chip" onclick="sendChip('นอนไม่หลับ/คิดมาก')">🌙 นอนไม่หลับ</span>
        <span class="mf-chip" onclick="sendChip('แค่อยากระบายเฉยๆ')">🗣️ แค่อยากระบาย</span>
      </div>

      <div id="mf-input-area">
        <input type="text" id="mf-input" placeholder="พิมพ์หรือกด 🎤 เพื่อพูด...">
        <button id="mf-mic-btn" class="mf-icon-btn" title="กดเพื่อพูด">🎤</button>
        <button id="mf-send-btn" class="mf-icon-btn" title="ส่ง">➤</button>
      </div>
    </div>
    
    <button id="mf-toggle-btn">
      <img src="https://files.catbox.moe/rdkdlq.jpg" alt="Chat Logo">
    </button>
  `;
  document.body.appendChild(container);

  // 3. Logic
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

  function speakText(text) {
    if (!isSoundOn) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH'; 
    utterance.rate = 1.0;     
    utterance.pitch = 1.0;    
    window.speechSynthesis.speak(utterance);
  }

  soundBtn.onclick = function() {
    isSoundOn = !isSoundOn;
    soundBtn.innerText = isSoundOn ? "🔊" : "🔇";
    soundBtn.className = isSoundOn ? "active" : "";
    if (isSoundOn) speakText("เปิดเสียงแล้วครับ");
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = function() { micBtn.classList.add('listening'); input.placeholder = "กำลังฟัง..."; };
    recognition.onend = function() { micBtn.classList.remove('listening'); input.placeholder = "พิมพ์หรือพูด..."; };
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
    if (role === 'bot' && isSoundOn) {
        const plainText = text.replace(/<[^>]*>?/gm, ''); 
        speakText(plainText);
    }
  }

  window.renameBot = function() {
    const currentName = document.getElementById('mf-bot-name').innerText;
    const newName = prompt("ตั้งชื่อเล่นให้ผมใหม่ได้เลยครับ:", currentName);
    if (newName && newName.trim() !== "") {
        document.getElementById('mf-bot-name').innerText = newName;
        messageHistory.push({ role: "system", content: `[System] User renamed you to "${newName}". Refer to yourself as "${newName}".` });
        appendMessage('system', `เปลี่ยนชื่อเป็น "${newName}" เรียบร้อยครับ`);
    }
  }

  window.sendChip = function(text) { input.value = text; sendMessage(); }

  async function sendMessage() {
    const text = input.value.trim();
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
        body: JSON.stringify({ messages: messageHistory })
      });
      const data = await res.json();
      document.getElementById('mf-loading').remove();
      if (data.crisis) {
        appendMessage('system', "⚠️ ตรวจพบความเสี่ยง: หากคุณรู้สึกไม่ไหว กรุณาติดต่อสายด่วนสุขภาพจิต 1323 ได้ตลอด 24 ชม.");
        if (data.resources) data.resources.forEach(r => appendMessage('bot', `📞 ${r.name}: ${r.info}`));
      } else if (data.ai?.choices) {
        const reply = data.ai.choices[0].message.content;
        appendMessage('bot', reply);
        messageHistory.push({ role: "assistant", content: reply });
      } else if (data.flagged) {
         appendMessage('system', "ข้อความของคุณไม่ผ่านการตรวจสอบความปลอดภัย");
      } else {
        appendMessage('bot', "เกิดข้อผิดพลาด: ระบบไม่ตอบสนอง");
      }
    } catch (err) {
      document.getElementById('mf-loading')?.remove();
      appendMessage('system', "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
    sendBtn.disabled = false;
  }
  sendBtn.onclick = sendMessage;
  input.onkeydown = (e) => { if(e.key==='Enter') sendMessage(); };
})();
