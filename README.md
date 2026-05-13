# LifeRPG — Прокачай свою жизнь

RPG-игра, где ты выполняешь реальные задания и прокачиваешь персонажа. AI (Gemini) проверяет фото для подтверждения выполнения квестов.

## Возможности

- 🧙 **Аватар с характеристиками** — Сила, Интеллект, Креативность, Дисциплина, Социальность
- 📖 **Сюжетная кампания** — 4 главы с квестами, связанные историей
- 📸 **AI-верификация** — загружаешь фото + комментарий, Gemini проверяет выполнение
- 🎁 **Лутбоксы** — случайный дроп после выполнения задач
- 🏪 **Магазин** — покупай экипировку за монеты
- 🔥 **Серия дней** — множитель XP за ежедневную активность

## Стек

- **Frontend**: React + Vite
- **Backend**: FastAPI + SQLAlchemy + SQLite
- **AI**: Google Gemini API (Vision)

## Запуск

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
GEMINI_API_KEY=your_key uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Открой http://localhost:5173
