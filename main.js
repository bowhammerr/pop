
function showToast(msg) {
  let toast = document.getElementById('shotToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'shotToast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function flashScreen() {
  let flash = document.getElementById('flash');
  if (!flash) {
    flash = document.createElement('div');
    flash.id = 'flash';
    document.body.appendChild(flash);
  }
  flash.classList.add('on');
  setTimeout(() => flash.classList.remove('on'), 120);
}
function nowMs(){ return Date.now(); }

let fistSince = 0;
let lastShot = 0;

function isFist(lm) {
  // Puño = puntas (8,12,16,20) NO están por encima de sus PIP (tip - 2)
  const fingers = [8,12,16,20];
  for (const tip of fingers) {
    const pip = tip - 2;
    if (lm[tip].y < lm[pip].y - 0.02) return false; // dedo extendido
  }
  return true;
}

async function captureFrame(videoEl) {
  const w = videoEl.videoWidth || 640;
  const h = videoEl.videoHeight || 480;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  // Espejo como el <video>
  ctx.translate(w, 0); ctx.scale(-1, 1);
  ctx.drawImage(videoEl, 0, 0, w, h);
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 1));
  const file = new File([blob], `espejo_${new Date().toISOString().replace(/[:.]/g,'-')}.png`, { type:'image/png' });
  return { blob, file, dataUrl: canvas.toDataURL('image/png') };
}

const SEND_WEBHOOK_URL = ""; // opcional: tu endpoint si querés que la envíe

async function sendOrSavePhoto(videoEl) {
  // Feedback inmediato
  flashScreen();
  showToast('📸 Capturando foto…');

  const { blob, file, dataUrl } = await captureFrame(videoEl);

  // 1) Compartir si el navegador lo permite (móvil)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Espejo IA - Foto' });
      showToast('📤 Foto compartida');
      return;
    } catch {} // usuario canceló
  }

  // 2) Webhook opcional
  if (SEND_WEBHOOK_URL) {
    try {
      await fetch(SEND_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: 'image/png',
          data: dataUrl.split(',')[1] // base64 puro
        })
      });
      showToast('📨 Foto enviada');
      return;
    } catch(e){ console.error('Webhook error:', e); }
  }

  // 3) Descarga local como fallback
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast('📥 Foto descargada');

  // (Opcional) registrar en Mensajes
  document.querySelector('#messages')?.insertAdjacentHTML(
    'afterbegin',
    `<li>📸 Foto ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</li>`
  );
}
const videoElement = document.getElementById('cam');
function showPage(index) {
pages.forEach((p, i) => p.classList.toggle('active', i === index));
}


navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }).then(stream => {
videoElement.srcObject = stream;
});


function updateTime() {
const d = new Date();
document.getElementById('time').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
document.getElementById('date').textContent = d.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });
}
setInterval(updateTime, 1000);
updateTime();


const frases = [
"Haz lo que puedas, con lo que tengas.",
"Cada día es una nueva oportunidad.",
"El futuro comienza hoy.",
"Respirá profundo, vas bien."
];
document.getElementById('quote').textContent = frases[Math.floor(Math.random() * frases.length)];


const API_KEY = '12d0069b1604bddd3e695eddd2f89524';
const LAT = -34.9, LON = -56.2;
async function fetchWeather() {
try {
const resp = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&lang=es&appid=${API_KEY}`);
const data = await resp.json();
const iconCode = data.weather[0].icon;
const desc = data.weather[0].description;
const temp = Math.round(data.main.temp);
const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
document.getElementById('icon').style.backgroundImage = `url('${iconUrl}')`;
document.getElementById('temp').textContent = `${temp}°C - ${desc}`;
} catch (e) {
document.getElementById('temp').textContent = 'Clima no disponible';
}
}
fetchWeather();


const hands = new Hands({locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({
maxNumHands: 1,
modelComplexity: 1,
minDetectionConfidence: 0.7,
minTrackingConfidence: 0.5
});
hands.onResults(results => {
  const lm = results.multiHandLandmarks?.[0];
  if (!lm) return;

  const t = nowMs();

  // --- GESTO: PUÑO CERRADO -> FOTO (mantener ~0.6s, cooldown 3s) ---
  if (isFist(lm)) {
    if (!fistSince) fistSince = t;
    // evita múltiples disparos seguidos
    const steady = t - fistSince > 600;
    const cooled = t - lastShot > 3000;
    if (steady && cooled) {
      lastShot = t;
      sendOrSavePhoto(document.getElementById('cam'));
    }
  } else {
    fistSince = 0;
  }

  // --- TU LÓGICA EXISTENTE DE SWIPE PARA CAMBIAR PÁGINAS ---
  // (ejemplo basado en lo que pasaste)
  const x = lm[0].x;
  if (!window.lastX) window.lastX = x;
  if (!window.lastTime) window.lastTime = t;

  if (t - window.lastTime > 1000) {
    const dx = x - window.lastX;
    if (dx > 0.15) {
      currentPage = (currentPage + 1) % pages.length;
      showPage(currentPage);
      window.lastTime = t;
    } else if (dx < -0.15) {
      currentPage = (currentPage - 1 + pages.length) % pages.length;
      showPage(currentPage);
      window.lastTime = t;
    }
    window.lastX = x;
  }
});



const camera = new Camera(videoElement, {
onFrame: async () => {
await hands.send({image: videoElement});
},
width: 640,
height: 480
});
camera.start();
