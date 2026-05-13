import os
import base64
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def configure_gemini():
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)


async def verify_task_photo(image_bytes: bytes, task_description: str, verification_prompt: str, user_comment: str) -> dict:
    """Verify a photo submission using Gemini Vision API."""
    if not GEMINI_API_KEY:
        return {
            "approved": False,
            "verdict": "API ключ Gemini не настроен. Обратитесь к администратору."
        }

    configure_gemini()

    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = f"""Ты — строгий судья в RPG-игре "LifeRPG", где люди выполняют реальные задания для прокачки персонажа.

Задание: {task_description}

Комментарий пользователя: {user_comment}

Критерии проверки: {verification_prompt}

Проанализируй фотографию и реши, выполнил ли пользователь задание. Будь строгим, но справедливым.

Ответь СТРОГО в формате:
РЕШЕНИЕ: ОДОБРЕНО или РЕШЕНИЕ: ОТКЛОНЕНО
ПРИЧИНА: [короткое объяснение на 1-2 предложения]

Если фото не соответствует заданию, явно поддельное или не имеет отношения к задаче — отклони.
Если фото показывает честную попытку выполнить задание — одобри."""

    image_part = {
        "mime_type": "image/jpeg",
        "data": base64.b64encode(image_bytes).decode("utf-8")
    }

    try:
        response = model.generate_content([prompt, image_part])
        text = response.text.strip()

        approved = "ОДОБРЕНО" in text.upper()

        reason_line = ""
        for line in text.split("\n"):
            if "ПРИЧИНА:" in line.upper():
                reason_line = line.split(":", 1)[1].strip()
                break

        if not reason_line:
            reason_line = text

        return {
            "approved": approved,
            "verdict": reason_line
        }
    except Exception as e:
        return {
            "approved": False,
            "verdict": f"Ошибка при проверке: {str(e)}"
        }
