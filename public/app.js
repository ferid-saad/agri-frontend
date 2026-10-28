const AUTH_URL = '/api/auth';
const IRRIGATION_URL = '/api/irrigation';

const $ = (id) => document.getElementById(id);
let token = sessionStorage.getItem('token');

function showMessage(text, isError = false) {
  const el = $('message');
  el.textContent = text;
  el.className = isError ? 'error' : 'success';
}

function render() {
  const connected = Boolean(token);
  $('auth-section').hidden = connected;
  $('app-section').hidden = !connected;
  $('logout').hidden = !connected;
  if (connected) refresh();
}

function logout(text = 'Vous êtes déconnecté.') {
  token = null;
  sessionStorage.removeItem('token');
  render();
  showMessage(text);
}

async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && token) {
    logout('Session expirée, reconnectez-vous.');
  }
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`);
  }
  return data;
}

const get = (url) => api(url);
const post = (url, body) => api(url, { method: 'POST', body: JSON.stringify(body) });
const patch = (url, body) => api(url, { method: 'PATCH', body: JSON.stringify(body) });

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

function emptyRow(columns, text) {
  const tr = document.createElement('tr');
  const td = cell(text);
  td.colSpan = columns;
  td.className = 'empty';
  tr.append(td);
  return tr;
}

function renderParcelles(parcelles) {
  const body = $('parcelles-body');
  body.replaceChildren();
  if (parcelles.length === 0) {
    body.append(emptyRow(4, 'Aucune parcelle pour le moment.'));
  }
  parcelles.forEach((p) => {
    const tr = document.createElement('tr');
    tr.append(cell(p.id), cell(p.nom), cell(p.surface_ha), cell(p.culture));
    body.append(tr);
  });

  const select = $('a-parcelle');
  select.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choisir une parcelle';
  select.append(placeholder);
  parcelles.forEach((p) => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = `${p.nom} (n° ${p.id})`;
    select.append(option);
  });
}

function renderArrosages(arrosages) {
  const body = $('arrosages-body');
  body.replaceChildren();
  if (arrosages.length === 0) {
    body.append(emptyRow(6, 'Aucun arrosage planifié.'));
  }
  arrosages.forEach((a) => {
    const tr = document.createElement('tr');

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '0.01';
    input.value = a.volume_reel_l ?? '';
    input.setAttribute('aria-label', `Consommation réelle de l'arrosage ${a.id}`);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'small';
    button.textContent = 'Enregistrer';
    button.addEventListener('click', () => saveReal(a.id, input.value));

    const box = document.createElement('div');
    box.className = 'reel-box';
    box.append(input, button);
    const reelCell = document.createElement('td');
    reelCell.append(box);

    const ecart =
      a.volume_reel_l === null
        ? '—'
        : (Number(a.volume_reel_l) - Number(a.volume_l)).toFixed(2);

    tr.append(
      cell(a.date_arrosage),
      cell(a.parcelle_nom),
      cell(a.duree_min),
      cell(a.volume_l),
      reelCell,
      cell(ecart)
    );
    body.append(tr);
  });
}

async function loadParcelles() {
  renderParcelles(await get(`${IRRIGATION_URL}/parcelles`));
}

async function loadArrosages() {
  renderArrosages(await get(`${IRRIGATION_URL}/arrosages`));
}

async function refresh() {
  try {
    await Promise.all([loadParcelles(), loadArrosages()]);
  } catch (err) {
    showMessage(err.message, true);
  }
}

async function saveReal(id, value) {
  if (value === '') {
    showMessage('Saisissez le volume réellement consommé.', true);
    return;
  }
  try {
    await patch(`${IRRIGATION_URL}/arrosages/${id}`, { volume_reel_l: Number(value) });
    showMessage('Consommation réelle enregistrée.');
    await loadArrosages();
  } catch (err) {
    showMessage(err.message, true);
  }
}

function credentials() {
  return { email: $('email').value.trim(), password: $('password').value };
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await post(`${AUTH_URL}/login`, credentials());
    token = data.token;
    sessionStorage.setItem('token', token);
    render();
    showMessage('Connexion réussie.');
  } catch (err) {
    showMessage(err.message, true);
  }
});

$('register-btn').addEventListener('click', async () => {
  try {
    await post(`${AUTH_URL}/register`, credentials());
    showMessage('Compte créé. Vous pouvez maintenant vous connecter.');
  } catch (err) {
    showMessage(err.message, true);
  }
});

$('parcelle-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const parcelle = await post(`${IRRIGATION_URL}/parcelles`, {
      nom: $('p-nom').value.trim(),
      surface_ha: Number($('p-surface').value),
      culture: $('p-culture').value.trim(),
    });
    showMessage(`Parcelle « ${parcelle.nom} » créée.`);
    e.target.reset();
    await loadParcelles();
  } catch (err) {
    showMessage(err.message, true);
  }
});

$('arrosage-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const arrosage = await post(`${IRRIGATION_URL}/arrosages`, {
      parcelle_id: Number($('a-parcelle').value),
      date_arrosage: $('a-date').value,
      duree_min: Number($('a-duree').value),
      volume_l: Number($('a-volume').value),
    });
    showMessage(`Arrosage planifié le ${arrosage.date_arrosage}.`);
    e.target.reset();
    await loadArrosages();
  } catch (err) {
    showMessage(err.message, true);
  }
});

$('logout').addEventListener('click', () => logout());

render();