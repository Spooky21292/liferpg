import os
import random
from datetime import datetime, timezone

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import User, CompletedTask, InventoryItem
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


# --- Quest endpoints ---

@app.get("/api/chapters")
def get_chapters():
    return CHAPTERS


@app.get("/api/users/{username}/current-quest")
def get_current_quest(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    chapter_index = user.current_chapter - 1
    if chapter_index >= len(CHAPTERS):
        return {"completed_all": True, "message": "Все главы пройдены! Ты — мастер!"}

    chapter = CHAPTERS[chapter_index]
    quest_index = user.current_quest_index

    if quest_index >= len(chapter["quests"]):
        return {"chapter_complete": True, "chapter": chapter["title"]}

    quest = chapter["quests"][quest_index]
    return {
        "chapter": chapter["title"],
        "chapter_description": chapter["description"],
        "chapter_id": chapter["id"],
        "quest": quest,
        "quest_number": quest_index + 1,
        "total_quests": len(chapter["quests"]),
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
