document.addEventListener('DOMContentLoaded', () => {
  const cfg = {
    areaWidth: 800,
    areaHeight: 520,
    basketWidth: 120,
    spawnInterval: 900,
    speedMin: 1.1,
    speedMax: 2.6,
    targetScore: 10,
    badChance: 0.30,
  };

  const gameArea = document.getElementById('gameArea');
  const basketEl = document.getElementById('basket');
  const scoreEl = document.getElementById('score');
  const startBtn = document.getElementById('start');
  const restartBtn = document.getElementById('restart');
  const imgUpload = document.getElementById('imgUpload');
  const modalRoot = document.getElementById('modalRoot');

  let state = {
    running: false,
    score: 0,
    elements: [],
    spawnTimer: null,
    lastTime: null,
    basketX: 0,
    areaRect: null,
    gameOver: false,
    userImageDataUrl: null,
  };

  function fitSizes() {
  const rect = gameArea.getBoundingClientRect();
  const effectiveWidth = Math.max(rect.width, gameArea.clientWidth, gameArea.scrollWidth || 0);
  state.areaRect = rect;
  state.areaWidth = effectiveWidth;
  state.areaHeight = rect.height;
}
  window.addEventListener('resize', fitSizes);

  function createFalling(type) {
    const el = document.createElement('div');
    el.className = 'item ' + (type === 'heart' ? 'heart' : 'bad');
    el.innerHTML = type === 'heart' ? '💗' : '🖤';
    gameArea.appendChild(el);
    const areaW = gameArea.clientWidth;
    const x = Math.random() * Math.max(10, areaW - 60) + 10;
    el.style.left = x + 'px';
    el.style.top = '-60px';
    const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin) + (state.score * 0.03);
    const obj = { el, x, y: -60, type, speed, size: 52 };
    state.elements.push(obj);
    return obj;
  }

  function spawnLoop() {
    if (!state.running) return;
    const isBad = Math.random() < cfg.badChance;
    createFalling(isBad ? 'bad' : 'heart');
    const next = Math.max(280, cfg.spawnInterval - state.score * 30 - Math.random() * 200);
    state.spawnTimer = setTimeout(spawnLoop, next);
  }

 function setBasketX(relativeX) {
  if (!state.areaRect) fitSizes();

  const basketWidth = basketEl.offsetWidth;
  const minX = 0;
  const maxX = Math.max(0, state.areaWidth - basketWidth);


  let desired = relativeX - basketWidth / 2;

  if (desired < minX) desired = minX;
  if (desired > maxX) desired = maxX;

  basketEl.style.left = desired + "px";
  state.basketX = desired;
}

  function checkCollision(obj) {
    const basketRect = basketEl.getBoundingClientRect();
    const areaRect = gameArea.getBoundingClientRect();
    const objRect = obj.el.getBoundingClientRect();

    const objCx = objRect.left + objRect.width / 2 - areaRect.left;
    const objCy = objRect.top + objRect.height / 2 - areaRect.top;
    const basketLeft = basketRect.left - areaRect.left;
    const basketRight = basketLeft + basketRect.width;
    const basketTop = basketRect.top - areaRect.top;
    return (objCx >= basketLeft && objCx <= basketRight && objCy >= basketTop - 8 && objCy <= gameArea.clientHeight);
  }

  function explodeAt(x, y) {
    const boom = document.createElement('div');
    boom.className = 'boom';
    gameArea.appendChild(boom);
    boom.style.left = x + 'px';
    boom.style.top = y + 'px';
    setTimeout(() => boom.remove(), 800);
  }

  function updateFrame(timestamp) {
    if (!state.running) return;
    if (!state.lastTime) state.lastTime = timestamp;
    const dt = timestamp - state.lastTime;
    state.lastTime = timestamp;
    const toRemove = [];
    for (const obj of state.elements) {
      obj.y += obj.speed * (dt / 16);
      if (obj.el) {
        obj.el.style.top = obj.y + 'px';
        obj.el.style.transform = `rotate(${Math.sin(obj.y / 20) * 12}deg)`;
      }
      if (checkCollision(obj)) {
        if (obj.type === 'heart') {
          state.score += 1;
          scoreEl.textContent = state.score;
          if (obj.el) obj.el.style.transform += ' scale(0.7)';
          setTimeout(() => { if (obj.el) obj.el.remove(); }, 160);
          toRemove.push(obj);
          if (state.score >= cfg.targetScore) {
            pauseGameForPopupSequence();
            return;
          }
        } else {
          explodeAt(obj.x + 26, obj.y + 26);
          endGame(false);
          return;
        }
      } else if (obj.y > gameArea.clientHeight + 80) {
        if (obj.el) obj.el.remove();
        toRemove.push(obj);
      }
    }
    state.elements = state.elements.filter(o => !toRemove.includes(o));
    requestAnimationFrame(updateFrame);
  }

  function startGame() {
    if (state.running) return;
    for (const o of state.elements) if (o.el) o.el.remove();
    state.elements = [];
    state.running = true;
    state.score = 0;
    scoreEl.textContent = '0';
    state.gameOver = false;
    state.lastTime = null;
    fitSizes();
    setBasketX(gameArea.clientWidth / 2);
    spawnLoop();
    requestAnimationFrame(updateFrame);
  }

  function stopSpawning() {
    if (state.spawnTimer) { clearTimeout(state.spawnTimer); state.spawnTimer = null; }
  }

  function endGame(won) {
    stopSpawning();
    state.running = false;
    state.gameOver = true;
    for (const o of state.elements) if (o.el) o.el.remove();
    state.elements = [];

    if (won) {
    
    } else {
      showModal({
        title: 'Game Over 😢',
        message: 'yahh, kamu gagal mendapatkan 10 hati aku😥 ayo coba lagi',
        buttons: [{ text: 'Coba lagi', action: () => { closeModal(); startGame(); } }, { text: 'Tutup', action: () => { closeModal(); } }]
      });
    }
  }

  function pauseGameForPopupSequence() {
    stopSpawning();
    state.running = false;

    showModal({
      title: 'yeyy kamu dapet semua hati aku',
      message: 'yeyy akhirnya kamu bisa ambil semua hatiku ❤️',
      buttons: [{ text: 'Lanjut', action: () => { closeModal(); setTimeout(() => showProposalModal(), 180); } }]
    });
  }

  function getUserImageOrPlaceholder() {
    if (state.userImageDataUrl) return state.userImageDataUrl;

    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect rx='20' width='100%' height='100%' fill='#fff7fb'/><g transform='translate(300,200)'><path d='M0-20 C-50 -70 -140 -50 -140 10 C-140 90 -10 150 0 170 C10 150 140 90 140 10 C140 -50 50 -70 0 -20 Z' fill='#ff9fcc' stroke='#ff5e9a' stroke-width='6'/></g></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

const popupGif = "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3BuMDB4ZnlpdnBhMHBmOGQxemhrdXl3aWVqd2c4ZnA3b2Z3bjJ1dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ruhRMwYZkcJ8q7QtqV/giphy.gif://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Zwa2RoOGNjNG53aXoxeTc4dHhzamZ0cXN5NW4zZ3J3cDhmcnllcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xi6QWQnARGX1HEGZSU/giphy.gif"; 
const ditolakGif = "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjJoNXl4MW05dWk2c2MybW1pNWMxbG9xYjhmeGVoeHFvOXp0dzYzNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ctXLLko0OadX1rCGnk/giphy.gif"
  function showProposalModal() {
    const imgUrl = "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExaTE3MGtzNnc2c3Bjb2I3aXdrZ3JxNHR2OWhzMzdlbWNtNWVoY29ociZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/c9BsV3dzANxuUapQxy/giphy.gif";
    showModal({
      title: 'Maukah kamu jadi pacarku?',
      message: 'Pilih jawabanmu di bawah ini',
      img: imgUrl,
      buttons: [
        {
          text: 'iya', action: () => {
            closeModal();
            setTimeout(() => showModal({
              title: 'Yeay! 💕',
              message: 'Hai pacar aku <3 pencet tombol dibawah yaa<3',
              img: popupGif,
              buttons: [{
                text: 'OK', action: () => {
                  closeModal();
                  window.location.href = "https://api.whatsapp.com/send/?phone=62895604473976&text=Iya%2C+aku+mau+jadi+pacar+kamu.&type=phone_number&app_absent=0";
                }
              }]
            }), 120);
          }
        },
        {
          text: 'tidak', action: () => {
            closeModal();

            
            const showConfirm = () => {
              const yakinX = Math.random() * 160 - 90; 
              const yakinY = Math.random() * 120 - 80;

              setTimeout(() => {
                showModal({
                  title: 'yakin ga mau?',
                  message: 'beneran nih ga mau sama aku? :(',
                  img: ditolakGif,
                  buttons: [
                    {
                      text: 'Yakin',
                      action: () => {
                        closeModal();
                        
                        showConfirm();
                      }
                    },
                    {
                      text: 'Mau',
                      action: () => {
                        closeModal();
                        setTimeout(() => showModal({
                          title: 'aww, jadi sayang deh',
                          message: 'Aww, thanks ya udah mau jadi pacarku',
                          img: popupGif,
                          buttons: [
                            {
                              text: 'iyaa, sama-sama',
                              action: () => {
                                closeModal();
                                window.location.href = "https://api.whatsapp.com/send/?phone=62895604473976&text=Iya%2C+aku+mau+jadi+pacar+kamu.&type=phone_number&app_absent=0";
                              }
                            }
                          ]
                        }), 120);
                      }
                    }
                  ]
                });

                
                requestAnimationFrame(() => {
                  const backdrop = modalRoot.querySelector('.modal-backdrop');
                  if (!backdrop) return;
                  const btns = Array.from(backdrop.querySelectorAll('button'));
                  const yakinBtn = btns.find(b => b.textContent.trim().toLowerCase() === 'yakin');
                  if (yakinBtn) {
                   
                    yakinBtn.style.position = 'relative';
                    yakinBtn.style.transition = 'transform 0.22s ease';
                    
                    yakinBtn.style.transform = `translate(${yakinX}px, ${yakinY}px)`;
                   
                  }
                });
              }, 120);
            };

            showConfirm();
          }
        }
      ]
    });
  }

  function showModal({ title = '', message = '', img = null, buttons = [] }) {
    if (!modalRoot) return;
    modalRoot.innerHTML = '';
    modalRoot.style.display = 'flex';

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';

    if (img) {
      const i = document.createElement('img');
      i.src = img;
      i.alt = 'image';
      i.style.maxWidth = '100%';
      i.style.borderRadius = '12px';
      modal.appendChild(i);
    }

    const h = document.createElement('h2');
    h.textContent = title;
    modal.appendChild(h);

    const p = document.createElement('p');
    p.textContent = message;
    modal.appendChild(p);

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'center';
    btnRow.style.gap = '10px';
    btnRow.style.marginTop = '12px';

    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.textContent = b.text;
      btn.className = 'btn';
      if (b.style) btn.style.cssText = b.style;
      btn.addEventListener('click', b.action);
      btnRow.appendChild(btn);
    }

    modal.appendChild(btnRow);
    backdrop.appendChild(modal);
    modalRoot.appendChild(backdrop);

    function onKey(e) {
      if (e.key === 'Escape') { closeModal(); }
    }
    document.addEventListener('keydown', onKey);

    modalRoot._cleanup = () => { document.removeEventListener('keydown', onKey); modalRoot.innerHTML = ''; modalRoot.style.display = 'none'; };
  }

  function closeModal() { if (modalRoot && modalRoot._cleanup) modalRoot._cleanup(); }

 
  

  if (gameArea) {
    gameArea.addEventListener('mousemove', (e) => {
      const rect = gameArea.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setBasketX(x);
    });

    gameArea.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const rect = gameArea.getBoundingClientRect();
      const x = t.clientX - rect.left;
      setBasketX(x);
    }, { passive: false });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') setBasketX(state.basketX - 30);
    if (e.key === 'ArrowRight') setBasketX(state.basketX + 30);
  });

  if (startBtn) startBtn.addEventListener('click', () => startGame());
  if (restartBtn) restartBtn.addEventListener('click', () => { closeModal(); startGame(); });

  if (imgUpload) {
    imgUpload.addEventListener('change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = function () {
        state.userImageDataUrl = reader.result;

        showModal({
          title: 'Preview gambar',
          message: 'Gambar akan digunakan di pop-up kedua ketika kamu mencapai target.',
          img: state.userImageDataUrl,
          buttons: [{ text: 'OK', action: () => { closeModal(); } }]
        });
      };
      reader.readAsDataURL(f);
    });
  }

  fitSizes();
  if (gameArea) setBasketX(gameArea.clientWidth / 2);

  (function easyInit() {
    showModal({
      title: 'Selamat datang!',
      message: 'Tangkap hatiku yang masih fresh (💓) untuk menambah poin. Hindari hati aku yang telah busuk agar tidak kalah:D',
      buttons: [{ text: 'Mainkan', action: () => { closeModal(); startGame(); } }]
    });
  })();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.spawnTimer) clearTimeout(state.spawnTimer);
  });
});
