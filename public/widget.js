(function() {
  // --- [CONFIG ZONE] ---
  const config = window.MindBotWidgetConfig || {};
  const API_URL = config.backendUrl || "https://mindfitness-ai-backend-4lfy.vercel.app/api/chat"; 
  const SOCIAL_LINK = config.socialLink || "https://lin.ee/BUzH2xD"; 
  const AVATAR_URL = config.avatar || "https://files.catbox.moe/rdkdlq.jpg"; 
  const PSYCHIATRIST_LINK = config.psychiatristLink || "https://www.facebook.com/share/p/1BuBPPWjGH/";
  const QR_CODE_URL = "https://files.catbox.moe/7v14nh.jpg"; 
  const THEME_COLOR = config.themeColor || "#007BFF"; 
  const BOT_NAME = config.assistantName || "MindBot";
  // ---------------------

  const style = document.createElement('style');
  style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
    #mf-widget-container { position: fixed; bottom: 20px; right: 20px; z-index: 99999; font-family: 'Sarabun', sans-serif; }
    
    #mf-toggle-btn { width: 65px; height: 65px; border-radius: 50%; background-color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.2); cursor: pointer; border: none; padding: 0; overflow: hidden; transition: transform 0.2s; }
    #mf-toggle-btn:hover { transform: scale(1.05); }
    #mf-toggle-btn img { width: 100%; height: 100%; object-fit: cover; }
    
    /* --- [Mobile Optimized Chat Window] --- */
    #mf-chat-window { 
        display: none; 
        width: 380px; 
        max-width: calc(100vw - 40px); /* เว้นขอบซ้ายขวาข้างละ 20px ในมือถือ */
        height: 650px; 
        max-height: 70vh; /* ลดความสูงลงเหลือ 70% ของจอ (กันติดขอบบน/ล่าง) */
        background: white; 
        border-radius: 16px; 
        box-shadow: 0 5px 30px rgba(0,0,0,0.25); 
        flex-direction: column; 
        overflow: hidden; 
        position: absolute; 
        bottom: 85px; /* ยกสูงขึ้นจากปุ่ม */
        right: 0; 
        border: 1px solid #e0e0e0; 
    }
    
    /* Header */
    #mf-header { background: ${THEME_COLOR}; color: white; padding: 15px; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
    #mf-header-top { display: flex; align-items: center; width: 100%; }
    #mf-header img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid white; margin-right: 10px; }
    #mf-bot-info { flex: 1; overflow: hidden; }
    #mf-bot-name { font-weight: bold; font-size: 18px; }
    #mf-doc-link { font-size: 12px; color: white; text-decoration: underline; opacity: 0.9; cursor: pointer; display: inline-block; margin-top: 2px; }
    #mf-header-actions { display: flex; gap: 10px; }
    #mf-contact-btn, #mf-sound-btn, #mf-close-btn { background: none; border: none; cursor: pointer; font-size: 22px; color: white; opacity: 0.9; padding: 0; text-decoration: none; display: flex; align-items: center; }

    /* Premium Button */
    #mf-premium-btn { background: linear-gradient(45deg, #FFD700, #FFA500); color: #333; border: none; padding: 6px 12px; border-radius: 15px; font-size: 12px; font-weight: bold; cursor: pointer; margin-top: 5px; width: fit-content; box-shadow: 0 2px 5px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 5px; animation: pulse-gold 2s infinite; }
    @keyframes pulse-gold { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }

    #mf-disclaimer { font-size: 11px; color: rgba(255,255,255,0.95); line-height: 1.3; background: rgba(0,0,0,0.15); padding: 8px; border-radius: 6px; margin-top: 5px; }

    /* Controls */
    #mf-controls { margin-top: 5px; }
    .mf-select { width: 100%; background: white; color: #333; border: 1px solid #ddd; border-radius: 8px; padding: 8px; font-size: 14px; font-family: 'Sarabun', sans-serif; cursor: pointer; outline: none; }

    /* Messages */
    #mf-messages { flex: 1; padding: 15px; overflow-y: auto; background: #f0f8ff; display: flex; flex-direction: column; gap: 12px; }
    .mf-msg { max-width: 85%; padding: 12px 16px; border-radius: 16px; font-size: 16px; line-height: 1.5; word-wrap: break-word; }
    .mf-msg.user { align-self: flex-end; background: ${THEME_COLOR}; color: white; border-bottom-right-radius: 4px; }
    .mf-msg.bot { align-self: flex-start; background: #ffffff; color: #333; border: 1px solid #e0e0e0; border-bottom-left-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
    .mf-msg.system { align-self: center; background: #fff3cd; color: #856404; font-size: 12px; text-align: center; width: 95%; margin: 5px 0; border-radius: 8px; padding: 8px; }
    
    /* Input Area */
    #mf-input-area { padding: 12px; border-top: 1px solid #eee; display: flex; gap: 8px; background: white; align-items: center; flex-shrink: 0; }
    #mf-input { flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 30px; outline: none; font-size: 16px; }
    #mf-input:focus { border-color: ${THEME_COLOR}; }
    .mf-icon-btn { background: ${THEME_COLOR}; color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; transition: 0.2s; }
    
    /* Modal Fix for Mobile */
    #mf-pay-modal { 
        display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.9); z-index: 100; 
        flex-direction: column; align-items: center; 
        padding: 20px; box-sizing: border-box;
        overflow-y: auto; justify-content: center;
    }
    #mf-pay-modal img { width: 140px; border-radius: 10px; margin: 10px 0; border: 3px solid white; }
    
    #mf-upload-box { margin: 10px 0; width: 100%; display: flex; justify-content: center; }
    #mf-slip-input { display: none; } 
    #mf-upload-label { background: #444; padding: 8px 15px; border-radius: 8px; cursor: pointer; border: 1px dashed #888; font-size: 14px; color: #ccc; transition: 0.2s; }
    
    #mf-pay-confirm { display: none; background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 25px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 10px; }
    #mf-pay-close { position: absolute; top: 15px; right: 15px; cursor: pointer; font-size: 28px; color: white; z-index: 101; }
  `;
  document.head.appendChild(style);

  // 2. Inject HTML
  const container = document.createElement('div');
  container.id = 'mf-widget-container';
  container.innerHTML = `
    <div id="mf-chat-window">
      <div id="mf-pay-modal">
        <span id="mf-pay-close" onclick="closePayModal()">×</span>
        <div style="margin-top: auto; margin-bottom: auto; display: flex; flex-direction: column; align-items: center;">
            <h3>💎 เจาะลึก (Premium 59.-)</h3>
            <p style="font-size:14px;">สแกนเพื่อรับบทวิเคราะห์เชิงลึก</p>
            <img src="${QR_CODE_URL}" alt="QR Code">
            <div id="mf-upload-box">
                <label for="mf-slip-input" id="mf-upload-label">📎 แนบสลิปโอนเงิน</label>
                <input type="file" id="mf-slip-input" accept="image/*" onchange="handleSlipUpload()">
            </div>
            <button id="mf-pay-confirm" onclick="confirmPay()">✅ ยืนยันการโอน</button>
        </div>
      </div>

      <div id="mf-header">
        <div id="mf-header-top">
            <img src="${AVATAR_URL}" alt="Avatar">
            <div id="mf-bot-info">
                <div id="mf-bot-name">${BOT_NAME}</div>
                <a id="mf-doc-link" href="${PSYCHIATRIST_LINK}" target="_blank">🏥 พบจิตแพทย์ (คลิก)</a>
            </div>
            <div id="mf-header-actions">
                <a id="mf-contact-btn" href="${SOCIAL_LINK}" target="_blank" title="แอด LINE">👤</a>
                <button id="mf-sound-btn" title="เปิด/ปิดเสียง">🔇</button>
                <span id="mf-close-btn" title="ปิด">×</span>
            </div>
        </div>
        <button id="mf-premium-btn" onclick="openPayModal()">💎 สมัครโหมดเจาะลึก (Premium)</button>
        <div id="mf-disclaimer">เราไม่ใช่จิตแพทย์ แต่เราคือพื้นที่เรียนรู้เรื่องสุขภาพจิตจากประสบการณ์จริงของผู้คน</div>
        <div id="mf-controls">
            <select id="mf-case-select" class="mf-select" onchange="updateSettings()">
                <option value="general">🍀 พื้นที่พักใจ (ทั่วไป)</option>
                <option value="depression">🌧️ ซึมเศร้า (Depression)</option>
                <option value="anxiety">⚡ วิตกกังวล (Anxiety)</option>
                <option value="burnout">🔋 หมดไฟ (Burnout)</option>
                <option value="relationship">💔 ความสัมพันธ์</option>
            </select>
        </div>
      </div>
      
      <div id="mf-messages">
        <div class="mf-msg bot">สวัสดีครับ ผม <b>${BOT_NAME}</b> 🤖<br>วันนี้อยากคุยเรื่องไหน เลือกหัวข้อด้านบนได้เลยนะครับ</div>
      </div>

      <div id="mf-input-area">
        <input type="text" id="mf-input" placeholder="พิมพ์หรือกด 🎤 ...">
        <button id="mf-mic-btn" class="mf-icon-btn">🎤</button>
        <button id="mf-send-btn" class="mf-icon-btn">➤</button>
      </div>
    </div>
    
    <button id="mf-toggle-btn">
      <img src="${AVATAR_URL}" alt="Chat Logo">
    </button>
  `;
  document.body.appendChild(container);

  // 3. Logic (เหมือนเดิม)
  let messageHistory = [];
  let isSoundOn = false; 
  let isPremiumMode = false;

  const chatWindow = document.getElementById('mf-chat-window');
  const toggleBtn = document.getElementById('mf-toggle-btn');
  const closeBtn = document.getElementById('mf-close-btn');
  const input = document.getElementById('mf-input');
  const sendBtn = document.getElementById('mf-send-btn');
  const micBtn = document.getElementById('mf-mic-btn');
  const soundBtn = document.getElementById('mf-sound-btn');
  const msgContainer = document.getElementById('mf-messages');
  const caseSelect = document.getElementById('mf-case-select');
  const payModal = document.getElementById('mf-pay-modal');
  const premiumBtn = document.getElementById('mf-premium-btn');
  const uploadLabel = document.getElementById('mf-upload-label');
  const payConfirmBtn = document.getElementById('mf-pay-confirm');

  window.openPayModal = function() { payModal.style.display = 'flex'; }
  window.closePayModal = function() { payModal.style.display = 'none'; }
  
  window.handleSlipUpload = function() {
      const fileInput = document.getElementById('mf-slip-input');
      if (fileInput.files.length > 0) {
          uploadLabel.innerText = "✅ แนบสลิปแล้ว";
          uploadLabel.style.background = "#28a745";
          uploadLabel.style.color = "white";
          payConfirmBtn.style.display = "block";
      }
  }

  window.confirmPay = function() {
    isPremiumMode = true;
    payModal.style.display = 'none';
    premiumBtn.style.display = 'none';
    appendMessage('system', "🎉 ได้รับสลิปแล้ว! เปิดใช้งานโหมดเจาะลึก (Premium) เรียบร้อยครับ");
    appendMessage('bot', "ขอบคุณครับ! ระบบพร้อมวิเคราะห์เชิงลึกแล้ว เล่าปัญหาของคุณมาได้เลยครับ 👇");
  }

  function speakText(text) {
    if (!isSoundOn) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH'; utterance.rate = 1.0; window.speechSynthesis.speak(utterance);
  }

  soundBtn.onclick = function() {
    isSoundOn = !isSoundOn;
    soundBtn.innerText = isSoundOn ? "🔊" : "🔇";
  }

  window.updateSettings = function() {
    const caseName = caseSelect.options[caseSelect.selectedIndex].text;
    appendMessage('system', `เปลี่ยนหัวข้อเป็น: ${caseName}`);
    messageHistory = [];
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'th-TH'; recognition.continuous = false; 
    recognition.onstart = function() { micBtn.style.background = "#dc3545"; input.placeholder = "กำลังฟัง..."; };
    recognition.onend = function() { micBtn.style.background = THEME_COLOR; input.placeholder = "..."; };
    recognition.onresult = function(event) { input.value = event.results[0][0].transcript; };
    micBtn.onclick = function() { recognition.start(); };
  } else { micBtn.style.display = 'none'; }

  function toggleChat() { 
      const isHidden = chatWindow.style.display === 'none';
      chatWindow.style.display = isHidden ? 'flex' : 'none';
  }
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

  async function sendMessage() {
    const text = input.value.trim();
    const caseType = caseSelect.value;
    if (!text) return;
    
    window.speechSynthesis.cancel();
    appendMessage('user', text);
    input.value = '';
    sendBtn.disabled = true;
    messageHistory.push({ role: "user", content: text });
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'mf-msg bot';
    loadingDiv.innerText = '...';
    loadingDiv.id = 'mf-loading';
    msgContainer.appendChild(loadingDiv);
    
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messageHistory, caseType: caseType, isPremium: isPremiumMode }) 
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
