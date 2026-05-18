let content = null;
const statusElement = document.getElementById('status');
const apiUrl = document.querySelector('main')?.dataset.api || '/api/content';

function setStatus(message, type = '') {
  statusElement.textContent = message;
  statusElement.className = `status ${type}`.trim();
}

function makeField(labelText, value, onInput, options = {}) {
  const label = document.createElement('label');
  label.textContent = labelText;

  const field = options.multiline ? document.createElement('textarea') : document.createElement('input');
  field.value = value ?? '';
  if (options.placeholder) field.placeholder = options.placeholder;
  field.addEventListener('input', () => onInput(field.value));
  label.append(field);
  return label;
}

function makeSelect(labelText, value, options, onInput) {
  const label = document.createElement('label');
  label.textContent = labelText;
  const select = document.createElement('select');
  options.forEach((option) => {
    const item = document.createElement('option');
    item.value = option.value;
    item.textContent = option.label;
    select.append(item);
  });
  select.value = value;
  select.addEventListener('change', () => onInput(select.value));
  label.append(select);
  return label;
}

function makeButton(label, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className || '';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function actionDefaults() {
  return { label: 'СМОТРЕТЬ', url: 'https://t.me/', style: 'primary' };
}

function itemDefaults(type) {
  if (type === 'plugins') {
    return {
      title: 'Новый плагин',
      tag: 'After Effects',
      tagTone: 'blue',
      description: 'Описание плагина',
      actions: [{ label: 'ОТКРЫТЬ', url: 'https://t.me/', style: 'primary' }],
    };
  }
  if (type === 'bots') {
    return {
      icon: '🤖',
      title: 'Новый бот',
      handle: '@bot',
      description: 'Описание бота',
      actions: [{ label: 'Запустить бота', url: 'https://t.me/', style: 'primary', telegram: true }],
    };
  }
  return {
    title: 'Новый дудориал',
    description: 'Описание дудориала',
    actions: [{ label: 'СМОТРЕТЬ', url: 'https://t.me/', style: 'primary' }],
  };
}

function renderActions(actions, rerender) {
  const wrapper = document.createElement('div');
  wrapper.className = 'full';
  actions.forEach((action, actionIndex) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.append(
      makeField('Текст кнопки', action.label, (value) => { action.label = value; }),
      makeField('Ссылка', action.url, (value) => { action.url = value; }),
      makeSelect('Стиль кнопки', action.style || 'primary', [
        { value: 'primary', label: 'Основная' },
        { value: 'secondary', label: 'Серая' },
        { value: 'outline', label: 'Контур' },
      ], (value) => { action.style = value; }),
      makeButton('Удалить кнопку', 'danger', () => {
        actions.splice(actionIndex, 1);
        if (actions.length === 0) actions.push(actionDefaults());
        rerender();
      }),
    );
    wrapper.append(card);
  });

  wrapper.append(makeButton('Добавить кнопку', 'secondary', () => {
    actions.push(actionDefaults());
    rerender();
  }));
  return wrapper;
}

function renderProfile() {
  const section = document.getElementById('profile');
  section.innerHTML = '<h2>Профиль</h2>';

  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.append(
    makeField('Заголовок страницы', content.pageTitle, (value) => { content.pageTitle = value; }),
    makeField('Имя/заголовок', content.profile.title, (value) => { content.profile.title = value; }),
    makeField('Подзаголовок', content.profile.subtitle, (value) => { content.profile.subtitle = value; }),
    makeField('Приветствие', content.profile.greeting, (value) => { content.profile.greeting = value; }),
    makeField('Аватар', content.assets.avatar, (value) => { content.assets.avatar = value; }),
    makeField('Фон', content.assets.background, (value) => { content.assets.background = value; }),
  );

  content.profile.paragraphs.forEach((paragraph, index) => {
    const card = document.createElement('div');
    card.className = 'card full';
    card.append(
      makeField(`Абзац ${index + 1}`, paragraph, (value) => { content.profile.paragraphs[index] = value; }, { multiline: true }),
      makeButton('Удалить абзац', 'danger', () => {
        content.profile.paragraphs.splice(index, 1);
        if (content.profile.paragraphs.length === 0) content.profile.paragraphs.push('');
        renderProfile();
      }),
    );
    grid.append(card);
  });

  grid.append(makeButton('Добавить абзац', 'secondary full', () => {
    content.profile.paragraphs.push('Новый абзац');
    renderProfile();
  }));
  section.append(grid);
}

function renderList(type, label) {
  const section = document.getElementById(type);
  const data = content[type];
  section.innerHTML = `<h2>${label}</h2>`;
  section.append(makeField('Название раздела', data.title, (value) => { data.title = value; }));

  data.items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    const grid = document.createElement('div');
    grid.className = 'grid';

    if (type === 'bots') {
      grid.append(makeField('Иконка', item.icon, (value) => { item.icon = value; }));
      grid.append(makeField('Ник/handle', item.handle, (value) => { item.handle = value; }));
    }

    grid.append(
      makeField('Название', item.title, (value) => { item.title = value; }),
      makeField('Описание', item.description, (value) => { item.description = value; }, { multiline: true }),
    );

    if (type === 'plugins') {
      grid.append(
        makeField('Метка', item.tag, (value) => { item.tag = value; }),
        makeSelect('Цвет метки', item.tagTone || 'blue', [
          { value: 'blue', label: 'Синий' },
          { value: 'orange', label: 'Оранжевый' },
          { value: 'red', label: 'Красный' },
        ], (value) => { item.tagTone = value; }),
      );
    }

    grid.append(renderActions(item.actions, () => renderList(type, label)));
    card.append(
      document.createElement('hr'),
      grid,
      makeButton('Удалить карточку', 'danger', () => {
        data.items.splice(index, 1);
        renderList(type, label);
      }),
    );
    card.querySelector('hr').remove();
    section.append(card);
  });

  section.append(makeButton('Добавить карточку', 'secondary', () => {
    data.items.push(itemDefaults(type));
    renderList(type, label);
  }));
}

function renderSecret() {
  const section = document.getElementById('secret');
  section.innerHTML = '<h2>Пасхалка</h2>';
  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.append(
    makeField('Трек', content.assets.secretTrack, (value) => { content.assets.secretTrack = value; }),
    makeField('Сколько тапов по аватару', String(content.secret.unlockTaps), (value) => {
      content.secret.unlockTaps = Number(value) || 5;
    }),
    makeField('Иконка', content.secret.icon, (value) => { content.secret.icon = value; }),
    makeField('Заголовок', content.secret.title, (value) => { content.secret.title = value; }),
    makeField('Подзаголовок', content.secret.subtitle, (value) => { content.secret.subtitle = value; }),
    makeField('Метка', content.secret.label, (value) => { content.secret.label = value; }),
    makeField('Название трека', content.secret.trackTitle, (value) => { content.secret.trackTitle = value; }),
    makeField('Кнопка назад', content.secret.backLabel, (value) => { content.secret.backLabel = value; }),
  );
  section.append(grid);
}

function render() {
  renderProfile();
  renderList('tutorials', 'Дудориалы');
  renderList('plugins', 'Плагины');
  renderList('bots', 'Боты');
  renderSecret();
}

async function loadContent() {
  const response = await fetch(apiUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error('Не удалось загрузить content.json');
  content = await response.json();
  render();
  setStatus('Готово к редактированию.');
}

async function saveContent() {
  setStatus('Сохраняю...');
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Не удалось сохранить');
  }

  setStatus('Сохранено в content.json.', 'ok');
}

document.getElementById('save-button').addEventListener('click', () => {
  saveContent().catch((error) => setStatus(error.message, 'error'));
});

loadContent().catch((error) => setStatus(error.message, 'error'));
