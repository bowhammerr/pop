// Elementos
const videoElement = document.getElementById('cam');
const pages = Array.from(document.querySelectorAll('.page'));
let currentPage = 0;

function showPage(index) {
  pages.forEach((p, i) => p.classList.toggle('active', i === index));
}
showPage(0);

// Cámara
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
  .then(stream => { videoElement.srcObject = stream; })
  .catch(err => console.error('Cam error:', err));

// Hora/fecha
function updateTime() {
  const d = new Date();
  document.getElementById('time').textContent =
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('date').textContent =
    d.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });
}
setInterval(updateTime, 1000); updateTime();

// Frase
const frases = [
  "Haz lo que puedas, con lo que tengas.",
  "Cada día es una nueva oportunidad.",
  "El futuro comienza hoy.",
  "Respirá profundo, vas bien."
];
document.getElementById('quote').textContent =
  frases[Math.floor(Math.random() * frases.length)];

// Clima (⚠ tu API key queda pública en Pages)
const API_KEY = '12d0069b1604bddd3e695eddd2f89524';
const LAT = -34.9, LON = -56.2;

async function fetchWeather() {
  try {
    const resp = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&lang=es&appid=${API_KEY}`
    );
    const data = await resp.json();
    const iconCode = data.weather[0].icon;
    const desc = data.weather[0].description;
    const temp = Math.round(data.main.temp);
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    document.getElementById('icon').style.backgroundImage = `url('${iconUrl}')`;
    document.getElementById('temp').textContent = `${temp}°C - ${desc}`;
  } catch {
    document.getElementById('temp').textContent = 'Clima no disponible';
  }
}
fetchWeather();

// Gestos (MediaPipe)
let lastX = null, lastTime = 0;
const hands = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5
});
hands.onResults(results => {
  if (!results.multiHandLandmarks?.length) return;
  const x = results.multiHandLandmarks[0][0].x;
  const now = Date.now();
  if (lastX == null) { lastX = x; lastTime = now; return; }
  if (now - lastTime > 1000) {
    const dx = x - lastX;
    if (dx > 0.15) {
      currentPage = (currentPage + 1) % pages.length;
      showPage(currentPage);
      lastTime = now;
    } else if (dx < -0.15) {
      currentPage = (currentPage - 1 + pages.length) % pages.length;
      showPage(currentPage);
      lastTime = now;
    }
    lastX = x;
  }
});

const camera = new Camera(videoElement, {
  onFrame: async () => { await hands.send({ image: videoElement }); },
  width: 640,
  height: 480
});
camera.start();
