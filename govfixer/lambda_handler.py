import json
import os
import uuid
import time
import base64
import logging
import boto3

from orchestrator import build_agent_with_history
from voice import synthesize_speech, start_transcription_job, get_transcription_result
from ocr import extract_text_from_image

# --- Logging ---
logger = logging.getLogger("govfixer.handler")
logger.setLevel(logging.INFO)

# --- AWS Clients ---
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-west-2"))
s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "us-west-2"))
sessions_table = dynamodb.Table(os.environ.get("SESSIONS_TABLE", "govfixer-sessions"))
BUCKET_NAME = os.environ.get("BUCKET_NAME", "")

# --- Limits ---
MAX_AUDIO_BYTES = 5 * 1024 * 1024    # 5 MB
MAX_IMAGE_BYTES = 5 * 1024 * 1024    # 5 MB
MAX_TEXT_LENGTH = 2000               # characters
SESSION_TTL_SECONDS = 86400          # 24 hours

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}


def _ok(body: dict) -> dict:
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps(body)}


def _err(code: int, msg: str) -> dict:
    return {"statusCode": code, "headers": CORS_HEADERS, "body": json.dumps({"error": msg})}


def _load_session(session_id: str) -> dict:
    try:
        resp = sessions_table.get_item(Key={"session_id": session_id})
        return resp.get("Item", {})
    except Exception as e:
        logger.warning({"action": "session_load_error", "session": session_id, "error": str(e)})
        return {}


def _save_session(session_id: str, message: str, response_text: str, history: list) -> None:
    try:
        updated_history = history + [
            {"role": "user", "content": message[:800]},
            {"role": "assistant", "content": response_text[:1500]},
        ]
        sessions_table.put_item(
            Item={
                "session_id": session_id,
                "history": updated_history[-12:],   # keep last 6 turns (12 messages)
                "last_message": message[:500],
                "last_response": response_text[:1000],
                "ttl": int(time.time()) + SESSION_TTL_SECONDS,
            }
        )
    except Exception as e:
        logger.error({"action": "session_save_error", "session": session_id, "error": str(e)})


def _get_agent(session: dict):
    history = session.get("history", [])
    return build_agent_with_history(history), history


def _generate_audio_url(text: str, session_id: str, language: str) -> str | None:
    """Generate TTS audio, upload to S3, return presigned URL. Returns None on failure."""
    if not BUCKET_NAME:
        return None
    try:
        audio_bytes = synthesize_speech(text, language_code=language)
        audio_key = f"audio/{session_id}/{uuid.uuid4()}.mp3"
        s3.put_object(Bucket=BUCKET_NAME, Key=audio_key, Body=audio_bytes, ContentType="audio/mpeg")
        return s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET_NAME, "Key": audio_key},
            ExpiresIn=600,
        )
    except Exception as e:
        logger.error({"action": "tts_error", "session": session_id, "error": str(e)})
        return None


def handler(event: dict, context) -> dict:
    # Handle CORS preflight
    method = (
        event.get("httpMethod")
        or event.get("requestContext", {}).get("http", {}).get("method", "")
    )
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
        if not isinstance(body, dict):
            return _err(400, "Invalid request body: must be a JSON object")
    except json.JSONDecodeError:
        return _err(400, "Invalid JSON body")

    session_id = body.get("session_id") or str(uuid.uuid4())
    input_type = body.get("type", "text")
    language = body.get("language", "en-IN")

    logger.info({"action": "request", "type": input_type, "session": session_id, "lang": language})

    session = _load_session(session_id)
    agent, history = _get_agent(session)

    # ── TEXT ──────────────────────────────────────────────────
    if input_type == "text":
        message = body.get("message", "").strip()
        if not message:
            return _err(400, "message is required")
        if len(message) > MAX_TEXT_LENGTH:
            return _err(400, f"Message too long (max {MAX_TEXT_LENGTH} characters)")

        try:
            response = agent(message)
            response_text = str(response)
        except Exception as e:
            logger.error({"action": "agent_error", "session": session_id, "error": str(e)})
            return _err(500, "Something went wrong processing your request. Please try again.")

        result = {"response": response_text, "session_id": session_id}

        # Generate voice response if requested or if language is Hindi
        if body.get("voice_response") or language.startswith("hi"):
            result["audio_url"] = _generate_audio_url(response_text, session_id, language)

        _save_session(session_id, message, response_text, history)
        logger.info({"action": "response_text", "session": session_id, "chars": len(response_text)})
        return _ok(result)

    # ── VOICE ─────────────────────────────────────────────────
    elif input_type == "voice":
        audio_b64 = body.get("audio_data", "")
        media_format = body.get("format", "webm").lower()
        if media_format not in ["webm", "mp4", "wav", "ogg", "mp3", "m4a"]:
            media_format = "webm"
        content_type = f"audio/{media_format}"

        if not audio_b64 or not BUCKET_NAME:
            return _err(400, "audio_data and BUCKET_NAME required for voice input")

        try:
            audio_bytes = base64.b64decode(audio_b64)
        except Exception:
            return _err(400, "Invalid base64 audio data")

        if len(audio_bytes) > MAX_AUDIO_BYTES:
            return _err(400, f"Audio file too large (max {MAX_AUDIO_BYTES // (1024*1024)}MB)")

        try:
            audio_key = f"audio-input/{session_id}/{uuid.uuid4()}.{media_format}"
            s3.put_object(Bucket=BUCKET_NAME, Key=audio_key, Body=audio_bytes, ContentType=content_type)
            s3_uri = f"s3://{BUCKET_NAME}/{audio_key}"

            job_name = f"gf-{uuid.uuid4().hex[:16]}"
            start_transcription_job(job_name, s3_uri, language_code=language, media_format=media_format)
            transcribe_result = get_transcription_result(job_name, max_wait_seconds=25)

            if transcribe_result["status"] != "completed" or not transcribe_result["text"]:
                reason = transcribe_result.get("reason", transcribe_result["status"])
                logger.warning({"action": "transcription_failed", "session": session_id, "reason": reason})
                return _err(500, "Could not understand the audio — please try again or use text input.")

            transcribed = transcribe_result["text"]
            logger.info({"action": "transcription_ok", "session": session_id, "text": transcribed[:100]})

            response = agent(transcribed)
            response_text = str(response)

            audio_url = _generate_audio_url(response_text, session_id, language)

            _save_session(session_id, transcribed, response_text, history)
            return _ok({
                "response": response_text,
                "transcribed": transcribed,
                "audio_url": audio_url,
                "session_id": session_id,
            })

        except Exception as e:
            logger.error({"action": "voice_error", "session": session_id, "error": str(e)})
            return _err(500, "Voice processing failed. Please try again or use text input.")

    # ── PHOTO ─────────────────────────────────────────────────
    elif input_type == "photo":
        image_b64 = body.get("image_data", "")
        if not image_b64 or not BUCKET_NAME:
            return _err(400, "image_data and BUCKET_NAME required for photo input")

        try:
            image_bytes = base64.b64decode(image_b64)
        except Exception:
            return _err(400, "Invalid base64 image data")

        if len(image_bytes) > MAX_IMAGE_BYTES:
            return _err(400, f"Image too large (max {MAX_IMAGE_BYTES // (1024*1024)}MB)")

        try:
            img_key = f"uploads/{session_id}/{uuid.uuid4()}.jpg"
            s3.put_object(Bucket=BUCKET_NAME, Key=img_key, Body=image_bytes, ContentType="image/jpeg")

            extracted_text = extract_text_from_image(BUCKET_NAME, img_key)
            if not extracted_text.strip():
                return _err(400, "Could not extract text from image — please try a clearer photo.")

            logger.info({"action": "ocr_ok", "session": session_id, "chars": len(extracted_text)})

            prompt = (
                f'I received this rejection message (extracted from a photo): "{extracted_text}"\n\n'
                f"Can you explain in plain language what this means and give me a step-by-step plan to fix it?"
            )
            response = agent(prompt)
            response_text = str(response)

            result = {
                "response": response_text,
                "extracted_text": extracted_text,
                "session_id": session_id,
            }

            # Generate audio for photo responses too if Hindi
            if language.startswith("hi"):
                result["audio_url"] = _generate_audio_url(response_text, session_id, language)

            _save_session(session_id, f"[PHOTO] {extracted_text[:400]}", response_text, history)
            return _ok(result)

        except Exception as e:
            logger.error({"action": "photo_error", "session": session_id, "error": str(e)})
            return _err(500, "Photo processing failed. Please try a clearer image or use text input.")

    return _err(400, f"Unknown input type: {input_type}")
