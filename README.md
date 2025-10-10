# 📊 Универсальная система аналитики рекламных кампаний

Современная веб-система для анализа лидов и конверсий с любого сайта или CRM. Подключается к любым источникам данных через универсальные API с поддержкой UTM-меток и детальной маркетинговой аналитики.

## 🚀 Быстрый старт

### 1. Запуск системы
```bash
# Установка зависимостей
cd server
npm install

# Запуск сервера (порт 4000)
npm run dev
```

### 2. Открыть дашборд
Перейдите в браузере: **http://localhost:4000**

## ✨ Возможности

### 📈 Современный дашборд
- **Карточки KPI**: лиды, конверсии, расход, ROI с автоматическим расчетом
- **Интерактивные графики**: динамика лидов по дням, распределение источников трафика
- **UTM-аналитика**: детальный анализ источников, кампаний и каналов
- **Статусы оплат**: отслеживание статусов и расчет доходов
- **Светлая тема** с современным дизайном и градиентами

### 📁 Импорт данных
- **CSV импорт**: перетащите Excel файл → автоматическое распознавание колонок
- **API загрузка**: отправка данных программно через REST API
- **Вебхуки**: универсальные эндпоинты для любых CRM

### 🔗 Подключение сайтов и CRM

#### 1. CRM системы (Bitrix24, amoCRM)
1. В настройках CRM найдите "Вебхуки" или "Интеграции"
2. Добавьте URL: `http://localhost:4000/api/webhook/bitrix24`
3. CRM будет автоматически отправлять лиды в систему

#### 2. Формы на сайте
Добавьте этот код в формы на вашем сайте:
```javascript
// При отправке формы
fetch('http://localhost:4000/api/webhook/forms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: document.querySelector('input[name="name"]').value,
    phone: document.querySelector('input[name="phone"]').value,
    email: document.querySelector('input[name="email"]').value,
    page: window.location.href,
    source: 'website_form'
  })
});
```

#### 3. Google Ads / Яндекс.Директ
Настройте отслеживание конверсий с отправкой данных на вебхук при совершении целевых действий.

## 🛠 API для разработчиков

### Загрузка лидов
```bash
# Одиночный лид
curl -X POST http://localhost:4000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "source": "google Ads",
    "company": "truboprovod", 
    "name": "Илья",
    "phone": "+77001234567",
    "city": "Алматы",
    "conversion": "WhatsApp",
    "spend": 13.55
  }'

# Пакетная загрузка
curl -X POST http://localhost:4000/api/leads \
  -H "Content-Type: application/json" \
  -d '[{...}, {...}]'
```

### Универсальный вебхук
```bash
curl -X POST http://localhost:4000/api/webhook/bitrix24 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Илья",
    "phone": "+77001234567", 
    "city": "Алматы",
    "keyword": "труба стальная",
    "cost": 9.25,
    "event": "WhatsApp"
  }'
```

### Получение данных
```bash
# Список лидов с фильтрами
GET /api/leads?from=2025-10-01&to=2025-10-03&source=google%20Ads&city=Алматы

# Метрики
GET /api/metrics?from=2025-10-01&to=2025-10-03
```

### CSV импорт
```bash
curl -X POST http://localhost:4000/api/upload-csv \
  -F "csv=@data.csv"
```

## 📊 Структура данных

Система принимает данные в едином формате с поддержкой UTM-меток:

| Поле | Описание | Пример |
|------|----------|--------|
| `time` | Время лида | "17:47:46" |
| `phone` | Телефон | "+77001234567" |
| `name` | Имя | "Илья" |
| `email` | Email | "user@example.com" |
| `source` | Источник | "google Ads", "Яндекс: Директ", "website_form" |
| `company` | Компания/продукт | "truboprovod", "black_metal" |
| `group_name` | Группа кампании | "otsinkovannaya_truba_klik" |
| `keywords` | Ключевые слова | "труба стальная 25 мм" |
| `conversion` | Тип конверсии | "WhatsApp", "tel: +7 (727) 312-28-22" |
| `micro_conversion` | Микроконверсия | "Фильтр", "support/licenses" |
| `micro_clicks` | Количество кликов фильтра | 3, 4, 2 |
| `city` | Город | "Алматы", "Шымкент" |
| `status` | Статус оплаты | "Оплачено", "Ожидает", "Отказ" |
| `amount` | Сумма дохода | 0, 1000 |
| `spend` | Расход | 13.55, 9.25 |
| `page` | Страница источника | "https://example.com/contact" |
| `utm_source` | UTM источник | "google", "yandex", "facebook" |
| `utm_medium` | UTM канал | "cpc", "social", "email" |
| `utm_campaign` | UTM кампания | "summer_sale", "brand_awareness" |
| `utm_term` | UTM ключевое слово | "трубы стальные" |
| `utm_content` | UTM контент | "banner_top", "text_ad" |

## 🔧 Настройка

### Переменные окружения (.env)
```env
PORT=4000
CLIENT_DIR=../client
DB_PATH=./data.sqlite
```

### База данных
- SQLite файл: `server/data.sqlite`
- Автоматические миграции при запуске
- Индексы для быстрого поиска

## 🚀 Деплой в продакшн

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ ./
COPY client/ ../client/
EXPOSE 4000
CMD ["npm", "start"]
```

### VPS/Render/Fly.io
1. Загрузите код на сервер
2. Установите Node.js 18+
3. `npm install` в папке `server`
4. `npm start` или используйте PM2
5. Настройте домен и SSL

## 📝 Расширение системы

### Добавление нового коннектора
1. Создайте новый эндпоинт в `server/src/routes.ts`
2. Добавьте маппинг полей для вашей CRM
3. Обновите список коннекторов в API `/api/connectors`

### Кастомные поля
Добавьте поля в таблицу `leads` и обновите:
- `server/src/db.ts` - схема БД
- `server/src/routes.ts` - маппинг полей
- `client/app.js` - колонки таблицы

## 🎯 Что дальше?

- [ ] Графики и диаграммы по продуктам/источникам
- [ ] Авторизация и мультитенантность
- [ ] Уведомления в Telegram/Slack
- [ ] Экспорт в Excel/PDF
- [ ] Мобильное приложение
- [ ] Интеграция с Facebook Ads, VK Ads

## 📞 Поддержка

Система готова к использованию! Если нужны доработки или интеграции с конкретными CRM - обращайтесь.
