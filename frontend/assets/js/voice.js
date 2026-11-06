import { autoH, showToast } from './utils.js';
import { sendMsg } from './chat.js';

let recognition = null;
let isRecording = false;

export function toggleVoice() {
  if (isRecording) { stopRecognition(); return; }
  startRecognition();
}

function startRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('⚠️ Trình duyệt không hỗ trợ nhận dạng giọng nói', true); return;
  }

  recognition = new SpeechRecognition();
  recognition.lang        = 'vi-VN';
  recognition.continuous  = false;
  recognition.interimResults = true;

  const ta  = document.getElementById('chatInput');
  const btn = document.getElementById('btnVoice');
  const ind = document.getElementById('voiceIndicator');

  isRecording = true;
  btn.classList.add('recording');
  btn.title = 'Dừng ghi âm';
  btn.textContent = '⏹';
  ind.classList.add('show');

  recognition.onresult = e => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    ta.value = transcript;
    autoH(ta);
  };

  recognition.onend = () => {
    isRecording = false;
    btn.classList.remove('recording');
    btn.title = 'Nhập bằng giọng nói';
    btn.textContent = '🎤';
    ind.classList.remove('show');
    // Tự động gửi nếu có nội dung
    if (ta.value.trim()) sendMsg();
  };

  recognition.onerror = e => {
    stopRecognition();
    showToast('Lỗi ghi âm: ' + e.error, true);
  };

  recognition.start();
}

function stopRecognition() {
  if (recognition) { recognition.stop(); recognition = null; }
  isRecording = false;
  const btn = document.getElementById('btnVoice');
  btn.classList.remove('recording');
  btn.textContent = '🎤';
  btn.title = 'Nhập bằng giọng nói';
  document.getElementById('voiceIndicator').classList.remove('show');
}

// ── Text-to-Speech ───────────────────────────────────────────────────────────
let currentUtterance = null;

export function speakText(text, btnEl) {
  if (!window.speechSynthesis) return;

  // Nếu đang đọc → dừng lại
  if (currentUtterance) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
    document.querySelectorAll('.btn-tts').forEach(b => b.classList.remove('speaking'));
    if (btnEl._wasSpeaking) { btnEl._wasSpeaking = false; return; }
  }

  const clean = text.replace(/<[^>]*>/g, '');
  const utt   = new SpeechSynthesisUtterance(clean);
  utt.lang  = 'vi-VN';
  utt.rate  = 1.0;
  utt.pitch = 1.0;

  // Tìm giọng tiếng Việt nếu có
  const voices = window.speechSynthesis.getVoices();
  const viVoice = voices.find(v => v.lang.startsWith('vi'));
  if (viVoice) utt.voice = viVoice;

  utt.onstart = () => { btnEl.classList.add('speaking'); btnEl._wasSpeaking = true; };
  utt.onend   = () => { btnEl.classList.remove('speaking'); btnEl._wasSpeaking = false; currentUtterance = null; };
  utt.onerror = () => { btnEl.classList.remove('speaking'); currentUtterance = null; };

  currentUtterance = utt;
  window.speechSynthesis.speak(utt);
}
