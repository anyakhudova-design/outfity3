// Weather-driven outfit for today/tomorrow using Open-Meteo daily endpoints.
const state = {
  gender: 'f',
  day: 'today', // 'today' | 'tomorrow'
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
function corridorFromMinMax(lo, hi){
  const l = Math.round(lo);
  const h = Math.round(hi);
  return `${l}…${h}°C`;
}
function round(v){ return Math.round((v + Number.EPSILON) * 10) / 10; }

function buildSuggestion({ tMid, wMax, hMean, rain }, gender){
  const main = [];
  const acc = [];
  const t = tMid, w = wMax, h = hMean;

  if (t <= 0) main.push('термолонгслив','тёплый свитер','пуховик','утеплённые брюки','зимние ботинки');
  else if (t <= 6) main.push('лонгслив','свитшот','пуховик','джинсы','ботинки');
  else if (t <= 12) main.push('свитшот','плащ/лёгкая куртка','джинсы','ботинки/кроссовки');
  else if (t <= 18) main.push('лонгслив/рубашка','лёгкая куртка/кардиган','джинсы/чиносы','кроссовки');
  else main.push('футболка','лёгкие брюки/юбка','кроссовки/лоферы');

  if (w >= 8) main.push('ветрозащитный слой/капюшон');
  if (rain) { acc.push('зонт'); main.push('водоотталкивающая обувь'); }
  if (h >= 80) acc.push('запасная кофта');

  if (gender === 'f'){
    if (t <= 12) acc.push('шарф', 'тёплая шапка');
    else acc.push('шарф по желанию');
  } else {
    if (t <= 12) acc.push('шапка', 'шарф по желанию');
  }

  const uniq = (arr)=>[...new Set(arr)];
  return { main: uniq(main), acc: uniq(acc) };
}

async function fetchDaily(lat, lon){
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum,relative_humidity_2m_mean&forecast_days=2&timezone=auto`;
  const r = await fetch(url);
  if(!r.ok) throw new Error('weather fetch failed');
  return await r.json();
}

function pickDay(daily, idx){
  // idx: 0 today, 1 tomorrow
  const tmax = daily.temperature_2m_max?.[idx];
  const tmin = daily.temperature_2m_min?.[idx];
  const wmax = daily.wind_speed_10m_max?.[idx];
  const rh = daily.relative_humidity_2m_mean?.[idx];
  const pr = daily.precipitation_sum?.[idx];

  const tMid = (typeof tmax === 'number' && typeof tmin === 'number')
    ? (tmax + tmin) / 2
    : null;

  return {
    tMid,
    tmin,
    tmax,
    wMax: typeof wmax === 'number' ? wmax : null,
    hMean: typeof rh === 'number' ? rh : null,
    rain: (typeof pr === 'number' ? pr : 0) > 0.1
  };
}

async function update(){
  try{
    const j = await fetchDaily(state.coords.lat, state.coords.lon);
    const idx = state.day === 'today' ? 0 : 1;
    const d = pickDay(j.daily, idx);

    const tShow = d.tMid!=null ? round(d.tMid) : '—';
    const wShow = d.wMax!=null ? round(d.wMax) : '—';
    const hShow = d.hMean!=null ? Math.round(d.hMean) : '—';

    setText('temp', tShow);
    setText('wind', wShow);
    setText('humidity', hShow);

    byId('temp-desc').textContent = (d.tMid==null) ? 'Нет данных.' : (d.tMid >= 0 ? 'На улице ясно.' : 'Морозит.');
    byId('wind-desc').textContent = (d.wMax==null) ? '—' : windDesc(d.wMax);
    byId('humid-desc').textContent = (d.hMean==null) ? '—' : humidDesc(d.hMean);

    const rec = buildSuggestion(d, state.gender);
    const chipsMain = byId('chips-main'); chipsMain.innerHTML = '';
    const chipsAcc = byId('chips-acc'); chipsAcc.innerHTML = '';
    rec.main.forEach(x => addChip(chipsMain, x));
    rec.acc.forEach(x => addChip(chipsAcc, x));

    const cor = (d.tmin!=null && d.tmax!=null) ? corridorFromMinMax(d.tmin, d.tmax) : '—';
    const precip = d.rain ? 'и возможны осадки' : 'и без осадков';
    byId('rec-summary').textContent = `Температурный коридор ${cor}, ветер ${wShow} м/с ${precip}.`;
    byId('loc-note').textContent = `Погода ${state.source}.`;
    byId('day-label').textContent = state.day === 'today' ? 'сегодня' : 'завтра';
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
  document.querySelectorAll('[data-gender]').forEach(b=>b.classList.remove('active'));
  document.querySelector(`[data-gender="${g}"]`).classList.add('active');
  update();
}
function setDay(d){
  state.day = d;
  document.querySelectorAll('[data-day]').forEach(b=>b.classList.remove('active'));
  document.querySelector(`[data-day="${d}"]`).classList.add('active');
  update();
}

function initSeg(){
  document.getElementById('seg-f').addEventListener('click', ()=>setGender('f'));
  document.getElementById('seg-m').addEventListener('click', ()=>setGender('m'));
  document.getElementById('seg-today').addEventListener('click', ()=>setDay('today'));
  document.getElementById('seg-tomorrow').addEventListener('click', ()=>setDay('tomorrow'));
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
