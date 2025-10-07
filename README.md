# Outfity — сегодня/завтра (статический прототип)

Теперь можно переключать **Сегодня / Завтра**. Данные берём из **Open-Meteo (daily)**:
- `temperature_2m_min/max` → формируем коридор и среднюю t для рекомендаций,
- `wind_speed_10m_max`, `relative_humidity_2m_mean`, `precipitation_sum`.

## Развёртывание
- **Netlify:** Drag & Drop этих трёх файлов (без папки). Build-команда не нужна, Publish — `/`.
- **GitHub Pages:** Загрузить файлы в корень репозитория → Settings → Pages → Deploy from branch → `main` + `/root`.
- **Vercel / Cloudflare Pages:** как статические ассеты без сборки.

## Кастомизация
Правила рекомендаций лежат в `app.js` → `buildSuggestion`.
