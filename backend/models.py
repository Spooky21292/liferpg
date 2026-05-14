from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(200), default=None)
    google_id = Column(String(200), default=None, index=True)
    telegram_id = Column(String(50), default=None, index=True)
    avatar_name = Column(String(100), default="Новичок")
    level = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    coins = Column(Integer, default=100)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Stats
    strength = Column(Integer, default=1)
    intelligence = Column(Integer, default=1)
    creativity = Column(Integer, default=1)
    discipline = Column(Integer, default=1)
    social = Column(Integer, default=1)

    # Equipped items
    equipped_armor = Column(String(50), default=None)
    equipped_weapon = Column(String(50), default=None)
    equipped_effect = Column(String(50), default=None)
    equipped_background = Column(String(50), default=None)

    # Current chapter progress
    current_chapter = Column(Integer, default=1)
    current_quest_index = Column(Integer, default=0)

    # Streak
    streak_days = Column(Integer, default=0)
    last_activity_date = Column(String(10), default=None)

    completed_tasks = relationship("CompletedTask", back_populates="user")
    inventory_items = relationship("InventoryItem", back_populates="user")
    user_tasks = relationship("UserTask", back_populates="user")
    custom_stats = relationship("CustomStat", backref="user", cascade="all, delete-orphan")


class CompletedTask(Base):
    __tablename__ = "completed_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quest_id = Column(String(50), nullable=False)
    photo_url = Column(Text, default=None)
    comment = Column(Text, default=None)
    ai_verdict = Column(Text, default=None)
    ai_approved = Column(Boolean, default=False)
    xp_earned = Column(Integer, default=0)
    coins_earned = Column(Integer, default=0)
    stat_type = Column(String(20), default=None)
    completed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="completed_tasks")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    item_id = Column(String(50), nullable=False)
    item_type = Column(String(20), nullable=False)  # armor, weapon, effect, background, title
    item_name = Column(String(100), nullable=False)
    item_rarity = Column(String(20), default="common")  # common, rare, epic, legendary
    acquired_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="inventory_items")


class UserTask(Base):
    __tablename__ = "user_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    stat = Column(String(20), default="discipline")
    xp = Column(Integer, default=50)
    scheduled_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="user_tasks")


class CustomStat(Base):
    __tablename__ = "custom_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    key = Column(String(50), nullable=False)  # internal key like "health"
    name = Column(String(100), nullable=False)  # display name like "Здоровье"
    value = Column(Integer, default=1)
    icon = Column(String(10), default="⚡")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class StatSnapshot(Base):
    __tablename__ = "stat_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD
    strength = Column(Integer, default=0)
    intelligence = Column(Integer, default=0)
    creativity = Column(Integer, default=0)
    discipline = Column(Integer, default=0)
    social = Column(Integer, default=0)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    tasks_completed = Column(Integer, default=0)
