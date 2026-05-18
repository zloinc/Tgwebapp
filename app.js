const tg = window.Telegram?.WebApp ?? {
  expand() {},
  ready() {},
  HapticFeedback: null,
  openTelegramLink(url) {
    window.location.href = url;
  },
};

let tapCount = 0;
let isSecretOpen = false;
let pageContent = null;

tg.expand();
tg.ready();

function setText(element, text) {
  element.textContent = text ?? '';
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createAction(action, compact = false) {
  const link = createElement('a');
  link.href = action.url || '#';
  link.textContent = action.label || 'Открыть';

  const style = action.style || 'primary';
  const base = compact
    ? 'flex-1 text-center text-xs font-bold py-2 rounded-lg'
    : 'block w-full text-center text-xs font-bold py-3 rounded-lg';

  const styles = {
    primary: 'bg-blue-600 text-white',
    secondary: 'bg-gray-700 text-white',
    outline: 'border border-white/20 text-white',
  };

  link.className = `${base} ${styles[style] || styles.primary}`;
  if (action.telegram) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      tg.openTelegramLink(action.url);
    });
  }
  return link;
}

function renderActions(actions, compact = false) {
  const list = actions || [];
  if (list.length > 1) {
    const row = createElement('div', 'flex gap-2');
    list.forEach((action) => row.append(createAction(action, true)));
    return row;
  }
  return createAction(list[0] || {}, compact);
}

function renderAbout(content) {
  const section = document.getElementById('about');
  section.innerHTML = '';

  const header = createElement('div', 'flex flex-col items-center text-center mb-6 mt-4');
  const avatar = createElement('div', 'w-24 h-24 rounded-full bg-gray-600 mb-4 flex items-center justify-center overflow-hidden shadow-2xl border-2 border-white/20 cursor-pointer transform active:scale-95 transition-transform');
  avatar.id = 'avatar-img';
  avatar.addEventListener('click', tapAvatar);

  const image = createElement('img', 'w-full h-full object-cover');
  image.src = content.assets.avatar;
  image.alt = 'Стас';
  avatar.append(image);

  const title = createElement('h1', 'text-2xl font-bold mb-1 text-white', content.profile.title);
  const subtitle = createElement('p', 'accent-text text-sm font-medium', content.profile.subtitle);
  header.append(avatar, title, subtitle);

  const card = createElement('div', 'card-bg rounded-2xl p-5 shadow-xl flex flex-col gap-4');
  card.append(createElement('h2', 'font-bold text-lg text-white mb-1', content.profile.greeting));

  const text = createElement('div', 'text-sm leading-relaxed text-gray-200 space-y-4');
  content.profile.paragraphs.forEach((paragraph) => {
    const item = createElement('p', '', paragraph);
    text.append(item);
  });
  card.append(text);
  section.append(header, card);
}

function renderCard(item, mode) {
  const card = createElement('div', 'card-bg rounded-xl p-4 border border-white/10');

  const titleClass = mode === 'plugins' ? 'font-bold text-blue-400 mb-1' : 'font-bold text-white mb-1';
  card.append(createElement('h2', titleClass, item.title));

  if (item.tag) {
    const tones = {
      blue: 'bg-blue-900/50 text-blue-200',
      orange: 'bg-orange-900/50 text-orange-200',
      red: 'bg-red-900/50 text-red-200',
    };
    card.append(createElement('div', `inline-block px-2 py-0.5 text-[9px] rounded uppercase mb-3 ${tones[item.tagTone] || tones.blue}`, item.tag));
  }

  const descriptionClass = mode === 'plugins' ? 'text-xs text-gray-300 mb-4' : 'text-[10px] text-gray-400 mb-4';
  card.append(createElement('p', descriptionClass, item.description));
  card.append(renderActions(item.actions, mode !== 'plugins'));
  return card;
}

function renderListSection(key) {
  const sectionData = pageContent[key];
  const section = document.getElementById(key);
  section.innerHTML = '';
  section.append(createElement('h1', 'text-2xl font-bold mb-6 px-2', sectionData.title));

  const list = createElement('div', 'flex flex-col gap-4');
  sectionData.items.forEach((item) => list.append(renderCard(item, key)));
  section.append(list);
}

function renderBots() {
  const section = document.getElementById('bots');
  section.innerHTML = '';
  section.append(createElement('h1', 'text-2xl font-bold mb-6 px-2', pageContent.bots.title));

  const list = createElement('div', 'flex flex-col gap-4');
  pageContent.bots.items.forEach((bot) => {
    const card = createElement('div', 'card-bg rounded-2xl p-6 border border-white/10');
    const head = createElement('div', 'flex items-center gap-4 mb-4');
    head.append(createElement('div', 'text-4xl', bot.icon));

    const text = createElement('div');
    text.append(createElement('h2', 'font-bold text-xl accent-text', bot.title));
    text.append(createElement('p', 'text-[10px] text-gray-400 uppercase', bot.handle));
    head.append(text);

    card.append(head);
    card.append(createElement('p', 'text-sm text-gray-300 mb-6', bot.description));
    card.append(renderActions(bot.actions));
    list.append(card);
  });
  section.append(list);
}

function renderSecret() {
  const section = document.getElementById('secret');
  const secret = pageContent.secret;
  section.innerHTML = `
    <div class="absolute inset-0 z-0 opacity-50 animate-disco"></div>
    <div class="relative z-10 p-6 flex flex-col items-center justify-center h-full text-center">
      <div class="text-6xl mb-6 drop-shadow-2xl animate-pulse">${secret.icon}</div>
      <h2 class="font-black text-3xl text-white mb-2 italic uppercase">${secret.title}</h2>
      <p class="text-sm text-pink-100 mb-8 font-medium">${secret.subtitle}</p>
      <div class="w-full max-w-xs bg-white/10 backdrop-blur-2xl rounded-3xl p-6 border border-white/20 shadow-2xl">
        <div class="mb-4">
          <div class="text-[10px] uppercase tracking-widest text-pink-300 font-bold mb-1">${secret.label}</div>
          <div class="text-white font-medium truncate">${secret.trackTitle}</div>
        </div>
        <audio id="secret-player" controls class="w-full h-10 invert brightness-200 opacity-80">
          <source src="${pageContent.assets.secretTrack}" type="audio/mpeg">
        </audio>
      </div>
      <button onclick="showSection('about')" class="mt-12 px-8 py-3 border border-white/30 rounded-full text-[10px] text-white/60 uppercase tracking-widest active:bg-white/10">${secret.backLabel}</button>
    </div>
  `;
}

function renderPage(content) {
  pageContent = content;
  document.title = content.pageTitle;
  document.body.style.backgroundImage = `url('${content.assets.background}')`;
  renderAbout(content);
  renderListSection('tutorials');
  renderListSection('plugins');
  renderBots();
  renderSecret();
  showSection('about', { silent: true });
}

function showSection(id, options = {}) {
  document.querySelectorAll('.section').forEach((element) => element.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.classList.remove('accent-text');
    button.classList.add('text-gray-400');
  });

  document.getElementById(id)?.classList.add('active');
  if (id !== 'secret') {
    const button = document.getElementById(`btn-${id}`);
    button?.classList.remove('text-gray-400');
    button?.classList.add('accent-text');
    document.getElementById('secret-player')?.pause();
    isSecretOpen = false;
    tapCount = 0;
  }

  if (!options.silent) tg.HapticFeedback?.impactOccurred('light');
}

function tapAvatar() {
  if (isSecretOpen || !pageContent) return;
  tapCount += 1;
  tg.HapticFeedback?.impactOccurred('medium');

  if (tapCount === pageContent.secret.unlockTaps) {
    isSecretOpen = true;
    tg.HapticFeedback?.notificationOccurred('success');
    showSection('secret', { silent: true });
    document.getElementById('secret-player')?.play().catch(() => {});
  }
}

async function init() {
  try {
    const contentSource = document.getElementById('app')?.dataset.contentSrc || 'content.json';
    const response = await fetch(contentSource, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
    renderPage(await response.json());
  } catch (error) {
    const about = document.getElementById('about');
    about.innerHTML = '<div class="card-bg rounded-2xl p-5 shadow-xl text-sm text-red-100">Не удалось загрузить content.json. Запусти локальный сервер из папки проекта.</div>';
    console.error(error);
  }
}

window.showSection = showSection;
window.tapAvatar = tapAvatar;
init();
