// Simple weather fetch via Open-Meteo (no key).
// Fallback to Moscow if geolocation is blocked.
const state = {
  gender: 'f',
  coords: { lat: 55.7558, lon: 37.6176 },
  source: 'по Москве (по умолчанию)'
};

function byId(id){ return document.getElementById(id); }
function setText(id, v){ byId(id).textContent = v; }

function windDesc(w){
  if (w < 2) return 'Штиль или очень слабый ветер.';
  if (w < 5) return 'Скорее слабый ветер.';
  if (w < 9) return 'Умеренный ветер.';
  if (w < 14) return 'Сильноватый ветер.';
  return 'Порывистый, очень сильный ветер.';
}
function humidDesc(h){
  if (h < 35) return 'Сухо.';
  if (h < 60) return 'Комфортная влажность.';
  if (h < 80) return 'Повышенная влажность.';
  return 'Влажно, возможен дискомфорт.';
}

function corridor(temp){
  const lo = Math.round(temp - 2);
  const hi = Math.round(temp + 4);
  return `${lo}…${hi}°C`;
}
function round(v){ return Math.round((v + Number.EPSILON) * 10) / 10; }

function buildSuggestion({ t, w, h, rain }, gender){
  const main = [];
  const acc = [];

  // base by temperature
  if (t <= 0) main.push('термолонгслив','тёплый свитер','пуховик','утеплённые брюки','зимние ботинки');
  else if (t <= 6) main.push('лонгслив','свитшот','пуховик','джинсы','ботинки');
  else if (t <= 12) main.push('свитшот','плащ/лёгкая куртка','джинсы','ботинки/кроссовки');
  else if (t <= 18) main.push('лонгслив/рубашка','лёгкая куртка/кардиган','джинсы/чиносы','кроссовки');
  else main.push('футболка','лёгкие брюки/юбка','кроссовки/лоферы');

  // wind
  if (w >= 8) main.push('ветрозащитный слой/капюшон');

  // humidity & rain
  if (rain) { acc.push('зонт'); main.push('водоотталкивающая обувь'); }
  if (h >= 80) acc.push('запасная кофта');

  // details by gender (just small tweaks)
  if (gender === 'f'){
    if (t <= 12) acc.push('шарф', 'тёплая шапка');
    else acc.push('шарф по желанию');
  } else {
    if (t <= 12) acc.push('шапка', 'шарф по желанию');
  }

  // deduplicate
  const uniq = (arr)=>[...new Set(arr)];
  return { main: uniq(main), acc: uniq(acc) };
}

async function fetchWeather(lat, lon){
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m`;
  const r = await fetch(url);
  if(!r.ok) throw new Error('weather fetch failed');
  const j = await r.json();
  const c = j.current || {};
  return {
    t: typeof c.temperature_2m === 'number' ? c.temperature_2m : null,
    h: typeof c.relative_humidity_2m === 'number' ? c.relative_humidity_2m : null,
    w: typeof c.wind_speed_10m === 'number' ? c.wind_speed_10m : null,
    rain: (typeof c.precipitation === 'number' ? c.precipitation : 0) > 0.05
  };
}

async function update(){
  try{
    const data = await fetchWeather(state.coords.lat, state.coords.lon);
    const t = data.t!=null ? round(data.t) : '—';
    const w = data.w!=null ? round(data.w) : '—';
    const h = data.h!=null ? Math.round(data.h) : '—';

    setText('temp', t);
    setText('wind', w);
    setText('humidity', h);

    byId('temp-desc').textContent = t==='—' ? 'Нет данных.' : (t >= 0 ? 'На улице ясно.' : 'Морозит.');
    byId('wind-desc').textContent = w==='—' ? '—' : windDesc(data.w);
    byId('humid-desc').textContent = h==='—' ? '—' : humidDesc(data.h);

    const rec = buildSuggestion({ t: data.t ?? 10, w: data.w ?? 3, h: data.h ?? 60, rain: data.rain }, state.gender);
    const chipsMain = byId('chips-main'); chipsMain.innerHTML = '';
    const chipsAcc = byId('chips-acc'); chipsAcc.innerHTML = '';
    rec.main.forEach(x => addChip(chipsMain, x));
    rec.acc.forEach(x => addChip(chipsAcc, x));

    const cor = corridor(data.t ?? 10);
    const precip = data.rain ? 'и возможны осадки' : 'и без осадков';
    byId('rec-summary').textContent = `Температурный коридор ${cor}, ветер ${w} м/с ${precip}.`;
    byId('loc-note').textContent = `Погода ${state.source}.`;
  }catch(e){
    console.error(e);
    byId('rec-summary').textContent = 'Не удалось получить погоду. Показываем универсальную рекомендацию.';
  }
}

function addChip(container, text){
  const el = document.createElement('span');
  el.className = 'chip';
  el.textContent = text;
  container.appendChild(el);
}

function setGender(g){
  state.gender = g;
  document.querySelectorAll('.seg').forEach(b=>b.classList.remove('active'));
  document.querySelector(`[data-gender="${g}"]`).classList.add('active');
  update();
}

function initSeg(){
  document.getElementById('seg-f').addEventListener('click', ()=>setGender('f'));
  document.getElementById('seg-m').addEventListener('click', ()=>setGender('m'));
}

function initGeo(){
  if(!('geolocation' in navigator)){
    byId('loc-note').textContent = 'Погода по Москве (по умолчанию).';
    update();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos)=>{
      state.coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      state.source = 'по вашей локации';
      update();
    },
    ()=>{
      state.coords = { lat: 55.7558, lon: 37.6176 };
      state.source = 'по Москве (по умолчанию)';
      update();
    },
    { enableHighAccuracy:false, timeout:5000, maximumAge:300000 }
  );
}

initSeg();
initGeo();
