(function() {
  // --- ตรวจสอบ URL ให้ตรงกับ Vercel ของคุณ (-4lfy หรือชื่อจริง) ---
  const API_URL = "https://mindfitness-ai-backend-4lfy.vercel.app/api/chat";

  // 1. Inject Styles
  const style = document.createElement('style');
  style.innerHTML = `
    #mf-widget-container { position: fixed; bottom: 20px; right: 20px; z-index: 99999; font-family: 'Sarabun', sans-serif; }
    #mf-toggle-btn { width: 60px; height: 60px; border-radius: 50%; background-color: #6A4BFF; box-shadow: 0 4px 12px rgba(0,0,0,0.2); cursor: pointer; border: none; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
    #mf-toggle-btn:hover { transform: scale(1.05); }
    #mf-chat-window { display: none; width: 350px; height: 500px; background: white; border-radius: 12px; box-shadow: 0 5px 25px rgba(0,0,0,0.2); flex-direction: column; overflow: hidden; position: absolute; bottom: 80px; right: 0; border: 1px solid #eee; }
    
    /* Header ปรับปรุงใหม่ */
    #mf-header { background: #6A4BFF; color: white; padding: 15px; font-weight: bold; display: flex; align-items: center; gap: 10px; }
    #mf-header img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid white; }
    #mf-bot-name-container { flex: 1; display: flex; align-items: center; gap: 5px; cursor: pointer; }
    #mf-edit-icon { font-size: 12px; opacity: 0.7; }
    #mf-bot-name-container:hover #mf-edit-icon { opacity: 1; text-decoration: underline; }

    #mf-messages { flex: 1; padding: 15px; overflow-y: auto; background: #f8f9fa; display: flex; flex-direction: column; gap: 10px; }
    .mf-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
    .mf-msg.user { align-self: flex-end; background: #6A4BFF; color: white; border-bottom-right-radius: 2px; }
    .mf-msg.bot { align-self: flex-start; background: #E9ECEF; color: #333; border-bottom-left-radius: 2px; }
    .mf-msg.system { align-self: center; background: #ffeeba; color: #856404; font-size: 12px; text-align: center; width: 95%; margin: 5px 0; }
    
    #mf-chips-area { padding: 10px 15px; background: #fff; border-top: 1px solid #f0f0f0; display: flex; flex-wrap: wrap; gap: 8px; }
    .mf-chip { background: #f1f3f5; color: #495057; border: 1px solid #dee2e6; padding: 6px 12px; border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.2s; user-select: none; }
    .mf-chip:hover { background: #6A4BFF; color: white; border-color: #6A4BFF; }

    #mf-input-area { padding: 12px; border-top: 1px solid #eee; display: flex; gap: 8px; background: white; }
    #mf-input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 20px; outline: none; font-size: 14px; }
    #mf-input:focus { border-color: #6A4BFF; }
    #mf-send-btn { background: #6A4BFF; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-weight: bold; }
    #mf-send-btn:disabled { background: #ccc; cursor: not-allowed; }
  `;
  document.head.appendChild(style);

  // 2. Inject HTML
  const container = document.createElement('div');
  container.id = 'mf-widget-container';
  container.innerHTML = `
    <div id="mf-chat-window">
      <div id="mf-header">
        <img src="https://files.catbox.moe/k4s55g.jpg" alt="Avatar">
        <div id="mf-bot-name-container" onclick="renameBot()" title="คลิกเพื่อตั้งชื่อบอท">
            <span id="mf-bot-name">MindFitness</span>
            <span id="mf-edit-icon">✏️</span>
        </div>
        <span style="margin-left:auto; cursor:pointer; font-size:18px;" id="mf-close-btn">×</span>
      </div>
      <div id="mf-messages">
        <div class="mf-msg bot">สวัสดีครับ ผมคือเพื่อนรับฟังของคุณ 😊<br>คุณสามารถ <b>คลิกที่ชื่อด้านบน</b> เพื่อตั้งชื่อเล่นให้ผมได้นะครับ</div>
      </div>
      
      <div id="mf-chips-area">
        <span class="mf-chip" onclick="sendChip('เครียดเรื่องงาน/เรียน')">😓 เครียดงาน/เรียน</span>
        <span class="mf-chip" onclick="sendChip('ความสัมพันธ์/ความรัก')">💔 ความรัก/ครอบครัว</span>
        <span class="mf-chip" onclick="sendChip('รู้สึกหมดไฟ (Burnout)')">🔋 รู้สึกหมดไฟ</span>
        <span class="mf-chip" onclick="sendChip('นอนไม่หลับ/คิดมาก')">🌙 นอนไม่หลับ</span>
        <span class="mf-chip" onclick="sendChip('แค่อยากระบายเฉยๆ')">🗣️ แค่อยากระบาย</span>
      </div>

      <div id="mf-input-area">
        <input type="text" id="mf-input" placeholder="พิมพ์ข้อความ...">
        <button id="mf-send-btn">ส่ง</button>
      </div>
    </div>
    <button id="mf-toggle-btn">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z"/></svg>
    </button>
  `;
  document.body.appendChild(container);

  // 3. Logic
  let messageHistory = [];
  const chatWindow = document.getElementById('mf-chat-window');
  const toggleBtn = document.getElementById('mf-toggle-btn');
  const closeBtn = document.getElementById('mf-close-btn');
  const input = document.getElementById('mf-input');
  const sendBtn = document.getElementById('mf-send-btn');
  const msgContainer = document.getElementById('mf-messages');

  function toggleChat() { chatWindow.style.display = chatWindow.style.display === 'flex' ? 'none' : 'flex'; }
  toggleBtn.onclick = toggleChat;
  closeBtn.onclick = toggleChat;

  function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `mf-msg ${role}`;
    div.innerHTML = text;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  // ฟังก์ชันเปลี่ยนชื่อบอท
  window.renameBot = function() {
    const currentName = document.getElementById('mf-bot-name').innerText;
    const newName = prompt("ตั้งชื่อเล่นให้ผมใหม่ได้เลยครับ:", currentName);
    
    if (newName && newName.trim() !== "") {
        // 1. เปลี่ยนชื่อหน้าจอ
        document.getElementById('mf-bot-name').innerText = newName;
        
        // 2. บอก AI ให้รู้ตัว (ส่ง System Message เงียบๆ)
        messageHistory.push({ 
            role: "system", 
            content: `[System Update] The user has renamed you to "${newName}". From now on, refer to yourself as "${newName}" in a friendly Thai male tone.` 
        });
        
        // 3. แจ้งเตือนในแชท
        appendMessage('system', `เปลี่ยนชื่อเป็น "${newName}" เรียบร้อยครับ`);
    }
  }

  window.sendChip = function(text) {
    input.value = text;
    sendMessage();
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    
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
