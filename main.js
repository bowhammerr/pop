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
