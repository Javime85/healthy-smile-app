/*
  Arxiu principal del nostre projecte visual.
  Aquí es gestionen la càmera, la detecció facial (MediaPipe), les partícules
  i els events dels botons i la tecla ESC per tancar l’aplicació.
*/

let ipcRenderer;
try {
  ipcRenderer = require('electron').ipcRenderer; // Intentem carregar Electron
} catch (e) {
  ipcRenderer = null; // Si no estem a Electron, posem null
}

window.onload = function() {
  const startButton = document.getElementById('startButton');
  const closeButton = document.getElementById('closeButton');

  // Quan cliquem “Començar”, amaguem el botó i iniciem el sistema de càmera
  startButton.onclick = function() {
    this.style.display = 'none';

    // --- CONFIGURACIÓ CANVAS I VIDEO ---
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    document.getElementById('canvasWrapper').appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const video = document.createElement('video');
    video.width = 640;
    video.height = 480;
    video.autoplay = true;
    video.playsInline = true;
    video.style.display = 'none';
    document.body.appendChild(video);

    // --- CLASS DE PARTÍCULES (ratpenats) ---
    const particles = [];
    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.alpha = 0;
        this.sizeX = 10;
        this.sizeY = 5;
        this.maxSizeX = 50 + Math.random() * 40;
        this.maxSizeY = 25 + Math.random() * 15;
        this.angle = Math.random() * Math.PI * 2;
        this.vx = 0;
        this.vy = 0;
        this.minVx = (Math.random() - 0.5) * 1;
        this.minVy = -(Math.random() * 1.5 + 0.8);
        this.rotateSpeed = (Math.random() - 0.5) * 0.05;
        this.life = 1;
        this.growthSpeed = 0.02;
        this.fadeInSpeed = 0.05;
        this.minAlpha = 0.25;
      }

      // Actualitzem posició i transparència
      update() {
        if (this.alpha < 1) this.alpha += this.fadeInSpeed;
        if (this.sizeX < this.maxSizeX) this.sizeX += this.growthSpeed * (this.maxSizeX - 10);
        if (this.sizeY < this.maxSizeY) this.sizeY += this.growthSpeed * (this.maxSizeY - 5);
        this.vx += (this.minVx - this.vx) * 0.02;
        this.vy += (this.minVy - this.vy) * 0.02;
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.rotateSpeed;
        this.life -= 0.008;
        this.alpha = this.life > 0 ? Math.max(this.life, this.minAlpha) : 0;
      }

      draw(ctx) {
        if (this.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = this.alpha;
          ctx.translate(this.x, this.y);
          ctx.rotate(this.angle);
          ctx.shadowColor = 'rgba(115, 64, 19, 0.7)';
          ctx.shadowBlur = 8;
          ctx.filter = 'drop-shadow(0 0 5px rgba(115, 64, 19, 0.7))';
          ctx.drawImage(batImg, -this.sizeX / 2, -this.sizeY / 2, this.sizeX, this.sizeY);
          ctx.restore();
        }
      }

      isDead() { return this.life <= 0; }
    }

    // --- CARREGUEM IMATGE DEL RATPENAT ---
    const batImg = new Image();
    batImg.src = "assets/ratpenats.png";
    let batImgLoaded = false;
    batImg.onload = () => {
      batImgLoaded = true;
      console.log("✅ Imatge de ratpenat carregada correctament");
    };

    // --- CONFIGURACIÓ DEL SO ---
    const sound = new Audio("assets/ratpenats.mp3");
    sound.loop = true;
    let soundPlaying = false;
    sound.oncanplaythrough = () => console.log("🎵 So carregat correctament");

    // --- ANIMACIÓ DE PARTÍCULES ---
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(ctx); });
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].isDead()) particles.splice(i, 1);
      }
      requestAnimationFrame(draw);
    }
    draw();

    // --- CONFIGURACIÓ DE MEDIAPIPE FACEMESH ---
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 5,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    const outerLip = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375,
                      291, 308, 324, 318, 402, 317, 14, 87, 178, 88,
                      95, 185, 40, 39, 37, 0, 267, 269, 270, 409,
                      415, 310, 311, 312, 13, 82, 81, 42, 183, 78, 61];

    // --- RESULTATS DE DETECCIÓ ---
    faceMesh.onResults((results) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      let anyMouthOpen = false;

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        results.multiFaceLandmarks.forEach((landmarks, idx) => {
          const upperLip = landmarks[13];
          const lowerLip = landmarks[14];
          const apertura = Math.abs(upperLip.y - lowerLip.y) * canvas.height;
          
          if (apertura > 10) { // Boca oberta -> efectes i so
            anyMouthOpen = true;
            ctx.save();
            ctx.beginPath();
            outerLip.forEach((idx, i) => {
              const pt = landmarks[idx];
              const x = pt.x * canvas.width;
              const y = pt.y * canvas.height;
              if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.strokeStyle = "orange";
            ctx.lineWidth = 4;
            ctx.shadowColor = "orange";
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.restore();

            // Afegim partícules des de la boca
            const now = Date.now();
            if (batImgLoaded && now - (window.lastParticleTime || 0) > 120) {
              const x = ((upperLip.x + lowerLip.x) / 2) * canvas.width;
              const y = ((upperLip.y + lowerLip.y) / 2) * canvas.height;
              particles.push(new Particle(x, y));
              window.lastParticleTime = now;
            }
          }
        });
      }

      // Control del so segons l’estat de la boca
      if (anyMouthOpen && !soundPlaying) {
        sound.play();
        soundPlaying = true;
      } else if (!anyMouthOpen && soundPlaying) {
        sound.pause();
        soundPlaying = false;
      }
    });

    // --- ACTIVA LA CÀMERA AMB MEDIAPIPE ---
    const camera = new Camera(video, {
      onFrame: async () => await faceMesh.send({ image: video }),
      width: 640,
      height: 480,
    });
    camera.start();

    // --- CONTROLAR TANCAMENT DE FINESTRA ---
    if (closeButton) {
      closeButton.onclick = () => {
        if (window.electronAPI && window.electronAPI.closeWindow) {
          window.electronAPI.closeWindow();
        } else {
          alert("Aquest botó només funciona dins Electron.");
        }
      };
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (window.electronAPI && window.electronAPI.closeWindow) {
          window.electronAPI.closeWindow();
        }
      }
    });
  };
};
