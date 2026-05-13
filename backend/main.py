import os
import random
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import List

import hashlib
import hmac

import httpx
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import User, CompletedTask, InventoryItem, UserTask
from quest_data import CHAPTERS, SHOP_ITEMS, LOOT_TABLE
from ai_verifier import verify_task_photo

Base.metadata.create_all(bind=engine)

app = FastAPI(title="LifeRPG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

XP_PER_LEVEL = 200
GOOGLE_CLIENT_ID = "855103585243-fqcdk0a5ces4i1b1gfd1vafvhlcrmpcu.apps.googleusercontent.com"
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "8701627127:AAGjCXMOgIhqwJhWqEbx0nki6BasnsCqAuc")


def calculate_level(xp: int) -> int:
    return max(1, xp // XP_PER_LEVEL + 1)


def roll_loot() -> dict | None:
    total_weight = sum(item["weight"] for item in LOOT_TABLE)
    roll = random.random() * total_weight
    current = 0
    for item in LOOT_TABLE:
        current += item["weight"]
        if roll <= current:
            return item
    return None


# --- User endpoints ---

@app.post("/api/users")
def create_user(username: str, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        return user_to_dict(existing)
    user = User(username=username)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user_to_dict(user)


@app.get("/api/users/{username}")
def get_user(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_to_dict(user)


def user_to_dict(user: User) -> dict:
    level = calculate_level(user.xp)
    xp_for_next = level * XP_PER_LEVEL
    xp_current_level = user.xp - (level - 1) * XP_PER_LEVEL
    return {
        "id": user.id,
        "username": user.username,
        "avatar_name": user.avatar_name,
        "level": level,
        "xp": user.xp,
        "xp_current_level": xp_current_level,
        "xp_for_next": XP_PER_LEVEL,
        "coins": user.coins,
        "stats": {
            "strength": user.strength,
            "intelligence": user.intelligence,
            "creativity": user.creativity,
            "discipline": user.discipline,
            "social": user.social,
        },
        "equipped": {
            "armor": user.equipped_armor,
            "weapon": user.equipped_weapon,
            "effect": user.equipped_effect,
            "background": user.equipped_background,
        },
        "current_chapter": user.current_chapter,
        "current_quest_index": user.current_quest_index,
        "streak_days": user.streak_days,
    }


# --- Auth endpoints ---

class GoogleAuthRequest(BaseModel):
    credential: str


@app.post("/api/auth/google")
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        idinfo = id_token.verify_oauth2_token(
            req.credential, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    google_id = idinfo["sub"]
    email = idinfo.get("email", "")
    name = idinfo.get("name", email.split("@")[0])

    user = db.query(User).filter(User.google_id == google_id).first()
    if user:
        return user_to_dict(user)

    if email:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.google_id = google_id
            db.commit()
            return user_to_dict(user)

    username = name.replace(" ", "_")[:30]
    base = username
    counter = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base}_{counter}"
        counter += 1

    user = User(username=username, email=email, google_id=google_id)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user_to_dict(user)


# Telegram link-based auth: token → pending/completed
telegram_auth_tokens: dict[str, dict] = {}  # token -> {"status": "pending"} or {"status": "ok", "username": "..."}
TELEGRAM_BOT_USERNAME = "liferrpg_app_bot"


@app.post("/api/auth/telegram/init")
def telegram_init():
    token = secrets.token_urlsafe(24)
    telegram_auth_tokens[token] = {"status": "pending"}
    return {
        "token": token,
        "link": f"https://t.me/{TELEGRAM_BOT_USERNAME}?start={token}",
    }


@app.get("/api/auth/telegram/check/{token}")
def telegram_check(token: str, db: Session = Depends(get_db)):
    entry = telegram_auth_tokens.get(token)
    if not entry:
        raise HTTPException(status_code=404, detail="Token not found")
    if entry["status"] == "pending":
        return {"status": "pending"}
    username = entry["username"]
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    del telegram_auth_tokens[token]
    return {"status": "ok", "user": user_to_dict(user)}


@app.post("/api/telegram/webhook")
async def telegram_webhook(request: dict, db: Session = Depends(get_db)):
    message = request.get("message", {})
    text = message.get("text", "")
    from_user = message.get("from", {})
    telegram_id = str(from_user.get("id", ""))
    chat_id = message.get("chat", {}).get("id")

    if not text.startswith("/start "):
        if chat_id:
            await send_telegram_message(chat_id, "Используй ссылку с сайта LifeRPG для входа.")
        return {"ok": True}

    token = text.replace("/start ", "").strip()
    if token not in telegram_auth_tokens:
        if chat_id:
            await send_telegram_message(chat_id, "Ссылка устарела. Получи новую на сайте LifeRPG.")
        return {"ok": True}

    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        tg_username = from_user.get("username", "")
        tg_first = from_user.get("first_name", "")
        username = (tg_username or tg_first or f"tg_{telegram_id}").replace(" ", "_")[:30]
        base = username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base}_{counter}"
            counter += 1
        user = User(username=username, telegram_id=telegram_id)
        db.add(user)
        db.commit()
        db.refresh(user)

    telegram_auth_tokens[token] = {"status": "ok", "username": user.username}

    if chat_id:
        await send_telegram_message(
            chat_id,
            f"Аккаунт успешно привязан.\nВаш логин: {user.username}\n\nВернитесь на сайт — вход произойдёт автоматически."
        )
    return {"ok": True}


async def send_telegram_message(chat_id: int, text: str):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient() as client:
        await client.post(url, json={"chat_id": chat_id, "text": text})


# --- Quest endpoints ---

@app.get("/api/chapters")
def get_chapters():
    return CHAPTERS


@app.get("/api/users/{username}/current-quest")
def get_current_quest(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_tasks = db.query(UserTask).filter(
        UserTask.user_id == user.id,
        UserTask.scheduled_date == today,
        UserTask.is_completed == False,
    ).all()

    user_quests = [
        {
            "id": f"user_{t.id}",
            "title": t.title,
            "description": t.description or t.title,
            "stat": t.stat,
            "xp": t.xp,
            "coins": 10,
            "verification_prompt": f"Пользователь должен показать фото, подтверждающее выполнение задачи: {t.title}",
            "is_user_task": True,
        }
        for t in today_tasks
    ]

    story_quest = None
    chapter_info = None

    chapter_index = user.current_chapter - 1
    if chapter_index < len(CHAPTERS):
        chapter = CHAPTERS[chapter_index]
        quest_index = user.current_quest_index
        if quest_index < len(chapter["quests"]):
            story_quest = chapter["quests"][quest_index]
            chapter_info = {
                "chapter": chapter["title"],
                "chapter_description": chapter["description"],
                "chapter_id": chapter["id"],
                "quest_number": quest_index + 1,
                "total_quests": len(chapter["quests"]),
            }
        elif not user_quests:
            return {"chapter_complete": True, "chapter": chapter["title"]}
    elif not user_quests:
        return {"completed_all": True, "message": "Все главы пройдены! Ты — мастер!"}

    return {
        "story_quest": story_quest,
        "chapter_info": chapter_info,
        "user_quests": user_quests,
    }


@app.post("/api/users/{username}/submit-task")
async def submit_task(
    username: str,
    quest_id: str = Form(...),
    comment: str = Form(""),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    quest = None
    for chapter in CHAPTERS:
        for q in chapter["quests"]:
            if q["id"] == quest_id:
                quest = q
                break

    if not quest:
        user_task = db.query(UserTask).filter(
            UserTask.id == int(quest_id.replace("user_", "")) if quest_id.startswith("user_") else UserTask.id == -1
        ).first()
        if user_task:
            quest = {
                "id": quest_id,
                "title": user_task.title,
                "description": user_task.description or user_task.title,
                "stat": user_task.stat,
                "xp": user_task.xp,
                "coins": 10,
                "verification_prompt": f"Пользователь должен показать фото, подтверждающее выполнение задачи: {user_task.title}",
                "is_user_task": True,
                "user_task_id": user_task.id,
            }
        else:
            raise HTTPException(status_code=404, detail="Quest not found")

    image_bytes = await photo.read()

    file_path = os.path.join(UPLOAD_DIR, f"{user.id}_{quest_id}_{int(datetime.now(timezone.utc).timestamp())}.jpg")
    with open(file_path, "wb") as f:
        f.write(image_bytes)

    result = await verify_task_photo(
        image_bytes=image_bytes,
        task_description=quest["description"],
        verification_prompt=quest["verification_prompt"],
        user_comment=comment,
    )

    xp_earned = 0
    coins_earned = 0
    loot = None
    level_up = False

    if result["approved"]:
        xp_earned = quest["xp"]
        coins_earned = quest["coins"]

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if user.last_activity_date != today:
            if user.last_activity_date:
                last = datetime.strptime(user.last_activity_date, "%Y-%m-%d")
                diff = (datetime.strptime(today, "%Y-%m-%d") - last).days
                if diff == 1:
                    user.streak_days += 1
                elif diff > 1:
                    user.streak_days = 1
            else:
                user.streak_days = 1
            user.last_activity_date = today

        streak_multiplier = 1 + (user.streak_days * 0.1)
        xp_earned = int(xp_earned * streak_multiplier)

        old_level = calculate_level(user.xp)
        user.xp += xp_earned
        user.coins += coins_earned
        new_level = calculate_level(user.xp)
        level_up = new_level > old_level

        stat = quest.get("stat")
        if stat == "strength":
            user.strength += 1
        elif stat == "intelligence":
            user.intelligence += 1
        elif stat == "creativity":
            user.creativity += 1
        elif stat == "discipline":
            user.discipline += 1
        elif stat == "social":
            user.social += 1

        if quest.get("is_user_task"):
            ut = db.query(UserTask).filter(UserTask.id == quest["user_task_id"]).first()
            if ut:
                ut.is_completed = True
        else:
            user.current_quest_index += 1
            chapter_index = user.current_chapter - 1
            if chapter_index < len(CHAPTERS):
                chapter = CHAPTERS[chapter_index]
                if user.current_quest_index >= len(chapter["quests"]):
                    user.current_chapter += 1
                    user.current_quest_index = 0

        loot_drop = roll_loot()
        if loot_drop:
            loot = loot_drop
            if loot_drop["effect"] == "xp_bonus":
                user.xp += loot_drop["value"]
            elif loot_drop["effect"] == "coin_bonus":
                user.coins += loot_drop["value"]
            elif loot_drop["effect"] == "stat_bonus":
                stat_name = loot_drop.get("stat", "discipline")
                current = getattr(user, stat_name, 0)
                setattr(user, stat_name, current + loot_drop["value"])
            elif loot_drop["effect"] == "title":
                inv = InventoryItem(
                    user_id=user.id,
                    item_id=loot_drop["id"],
                    item_type="title",
                    item_name=loot_drop["name"],
                    item_rarity=loot_drop["rarity"],
                )
                db.add(inv)

    task = CompletedTask(
        user_id=user.id,
        quest_id=quest_id,
        photo_url=file_path,
        comment=comment,
        ai_verdict=result["verdict"],
        ai_approved=result["approved"],
        xp_earned=xp_earned,
        coins_earned=coins_earned,
        stat_type=quest.get("stat"),
    )
    db.add(task)
    db.commit()
    db.refresh(user)

    return {
        "approved": result["approved"],
        "verdict": result["verdict"],
        "xp_earned": xp_earned,
        "coins_earned": coins_earned,
        "level_up": level_up,
        "loot": loot,
        "user": user_to_dict(user),
    }


# --- User Tasks endpoints ---

@app.get("/api/users/{username}/tasks")
def get_user_tasks(username: str, date: str = None, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    q = db.query(UserTask).filter(UserTask.user_id == user.id)
    if date:
        q = q.filter(UserTask.scheduled_date == date)
    tasks = q.order_by(UserTask.scheduled_date, UserTask.created_at).all()

    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "stat": t.stat,
            "xp": t.xp,
            "scheduled_date": t.scheduled_date,
            "is_completed": t.is_completed,
        }
        for t in tasks
    ]


@app.post("/api/users/{username}/tasks")
def create_user_task(
    username: str,
    title: str = Form(...),
    description: str = Form(""),
    stat: str = Form("discipline"),
    xp: int = Form(50),
    scheduled_date: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    task = UserTask(
        user_id=user.id,
        title=title,
        description=description,
        stat=stat,
        xp=xp,
        scheduled_date=scheduled_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "stat": task.stat,
        "xp": task.xp,
        "scheduled_date": task.scheduled_date,
        "is_completed": task.is_completed,
    }


@app.delete("/api/users/{username}/tasks/{task_id}")
def delete_user_task(username: str, task_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    task = db.query(UserTask).filter(UserTask.id == task_id, UserTask.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"success": True}


# --- Shop endpoints ---

@app.get("/api/shop")
def get_shop():
    return SHOP_ITEMS


@app.post("/api/users/{username}/buy")
def buy_item(username: str, item_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    item = None
    for shop_item in SHOP_ITEMS:
        if shop_item["id"] == item_id:
            item = shop_item
            break

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    existing = db.query(InventoryItem).filter(
        InventoryItem.user_id == user.id,
        InventoryItem.item_id == item_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Предмет уже куплен")

    if user.coins < item["price"]:
        raise HTTPException(status_code=400, detail="Недостаточно монет")

    user.coins -= item["price"]

    inv = InventoryItem(
        user_id=user.id,
        item_id=item_id,
        item_type=item["type"],
        item_name=item["name"],
        item_rarity=item["rarity"],
    )
    db.add(inv)
    db.commit()
    db.refresh(user)

    return {"success": True, "user": user_to_dict(user), "item": item}


@app.post("/api/users/{username}/equip")
def equip_item(username: str, item_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    inv = db.query(InventoryItem).filter(
        InventoryItem.user_id == user.id,
        InventoryItem.item_id == item_id,
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Предмет не найден в инвентаре")

    if inv.item_type == "armor":
        user.equipped_armor = item_id
    elif inv.item_type == "weapon":
        user.equipped_weapon = item_id
    elif inv.item_type == "effect":
        user.equipped_effect = item_id
    elif inv.item_type == "background":
        user.equipped_background = item_id

    db.commit()
    db.refresh(user)
    return {"success": True, "user": user_to_dict(user)}


@app.get("/api/users/{username}/inventory")
def get_inventory(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    items = db.query(InventoryItem).filter(InventoryItem.user_id == user.id).all()
    return [
        {
            "id": item.item_id,
            "type": item.item_type,
            "name": item.item_name,
            "rarity": item.item_rarity,
        }
        for item in items
    ]


@app.get("/api/users/{username}/history")
def get_history(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tasks = (
        db.query(CompletedTask)
        .filter(CompletedTask.user_id == user.id)
        .order_by(CompletedTask.completed_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "quest_id": t.quest_id,
            "comment": t.comment,
            "ai_verdict": t.ai_verdict,
            "ai_approved": t.ai_approved,
            "xp_earned": t.xp_earned,
            "coins_earned": t.coins_earned,
            "stat_type": t.stat_type,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        }
        for t in tasks
    ]


# --- AI Coach endpoint ---

GENAPI_KEY = os.getenv("GENAPI_KEY", "")
COACH_URL = "https://proxy.gen-api.ru/v1/chat/completions"
COACH_MODEL = "gemini-2-5-flash-lite"

STAT_LABELS = {
    "strength": "Сила",
    "intelligence": "Интеллект",
    "creativity": "Креативность",
    "discipline": "Дисциплина",
    "social": "Социальность",
}


class ChatMessage(BaseModel):
    role: str
    content: str


class CoachRequest(BaseModel):
    messages: List[ChatMessage]


@app.post("/api/users/{username}/coach")
async def coach_chat(username: str, req: CoachRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not GENAPI_KEY:
        return {"reply": "API ключ не настроен."}

    level = calculate_level(user.xp)
    stats = {
        "strength": user.strength,
        "intelligence": user.intelligence,
        "creativity": user.creativity,
        "discipline": user.discipline,
        "social": user.social,
    }
    stats_text = ", ".join(f"{STAT_LABELS[k]}: {v}" for k, v in stats.items())

    sorted_stats = sorted(stats.items(), key=lambda x: x[1])
    weakest = [STAT_LABELS[s[0]] + f" ({s[0]}): {s[1]}" for s in sorted_stats[:2]]
    strongest = [STAT_LABELS[s[0]] + f" ({s[0]}): {s[1]}" for s in sorted_stats[-1:]]

    system_prompt = f"""Ты — строгий но мудрый наставник в RPG-игре "LifeRPG". Ты говоришь коротко, по делу, в стиле RPG-мастера.

Данные героя:
- Уровень: {level}
- XP: {user.xp}
- Серия дней: {user.streak_days}
- Статы: {stats_text}
- САМЫЕ СЛАБЫЕ статы (качай их В ПЕРВУЮ ОЧЕРЕДЬ): {', '.join(weakest)}
- Самый сильный стат: {', '.join(strongest)}

Правила:
- Отвечай на русском
- Будь строгим но справедливым
- Если жалуются на лень — не жалей, мотивируй жёстко
- Предлагай конкретные действия на ближайшие 10-30 минут
- Используй RPG-метафоры (квесты, прокачка, босс-лень и тд)
- Отвечай коротко: 2-4 предложения максимум
- ВСЕГДА предлагай задачи для САМЫХ СЛАБЫХ статов. Не давай задачи на статы которые и так высокие!
- Когда предлагаешь конкретное задание, добавь его в формате: [TASK:название задачи|стат] где стат один из: strength, intelligence, creativity, discipline, social
- Пример: [TASK:50 приседаний|strength] или [TASK:Прочитать 20 страниц|intelligence]
- Можно предложить 1-3 задачи за раз
- НЕ используй ** для выделения. Используй ЗАГЛАВНЫЕ БУКВЫ для акцента.
- Задачи должны быть ПРОСТЫЕ и БЫСТРЫЕ (5-15 минут). Герой ещё низкого уровня, не давай сложные задания."""

    messages = [{"role": "system", "content": system_prompt}]
    for m in req.messages[-10:]:
        messages.append({"role": m.role, "content": m.content})

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                COACH_URL,
                json={"model": COACH_MODEL, "messages": messages, "max_tokens": 200},
                headers={
                    "Authorization": f"Bearer {GENAPI_KEY}",
                    "Content-Type": "application/json",
                },
            )
            data = resp.json()
            choices = data.get("choices", [])
            if choices:
                reply = choices[0].get("message", {}).get("content", "")
                if reply:
                    return {"reply": reply.strip()}
            return {"reply": "Наставник молчит... Попробуй ещё раз."}
    except Exception as e:
        return {"reply": f"Ошибка связи: {str(e)}"}


# --- Serve frontend static files ---

STATIC_DIR = Path(__file__).parent / "static"

if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{path:path}")
    async def serve_frontend(path: str):
        file_path = STATIC_DIR / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))
