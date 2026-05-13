import os
import io
import base64
import httpx
from PIL import Image

GENAPI_KEY = os.getenv("GENAPI_KEY", "")
GENAPI_URL = "https://proxy.gen-api.ru/v1/chat/completions"
MODEL = "gemini-2-5-flash-lite"

MAX_SIZE = 512
JPEG_QUALITY = 60


def compress_image(image_bytes: bytes) -> str:
    img = Image.open(io.BytesIO(image_bytes))
    img = img.convert("RGB")
    w, h = img.size
    if max(w, h) > MAX_SIZE:
        ratio = MAX_SIZE / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


async def verify_task_photo(image_bytes: bytes, task_description: str, verification_prompt: str, user_comment: str) -> dict:
    if not GENAPI_KEY:
        return {
            "approved": False,
            "verdict": "API ключ не настроен."
        }

    b64_image = compress_image(image_bytes)

    prompt = f"""Ты — строгий судья в RPG-игре "LifeRPG". Проверь фото.

Задание: {task_description}
Комментарий: {user_comment}
Критерии: {verification_prompt}

Ответь СТРОГО:
РЕШЕНИЕ: ОДОБРЕНО или РЕШЕНИЕ: ОТКЛОНЕНО
ПРИЧИНА: [1 предложение]"""

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64_image}"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 100
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                GENAPI_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {GENAPI_KEY}",
                    "Content-Type": "application/json"
                }
            )
            data = resp.json()

            if data.get("error"):
                return {"approved": False, "verdict": f"Ошибка API: {data['error']}"}

            text = ""
            choices = data.get("choices", [])
            if choices and isinstance(choices, list):
                text = choices[0].get("message", {}).get("content", "")

            if not text:
                return {"approved": False, "verdict": "Не удалось получить ответ от AI."}

            text = text.strip()
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
