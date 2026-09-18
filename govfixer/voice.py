import os
import logging
import boto3

logger = logging.getLogger("govfixer.voice")
logger.setLevel(logging.INFO)

polly = boto3.client("polly", region_name=os.environ.get("AWS_REGION", "us-west-2"))
transcribe = boto3.client("transcribe", region_name=os.environ.get("AWS_REGION", "us-west-2"))
s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "us-west-2"))

VOICE_MAP = {
    "hi-IN": "Kajal",
    "en-IN": "Kajal",
    "en-US": "Joanna",
}

# Polly synthesize_speech has a 3000-character limit.
POLLY_CHAR_LIMIT = 2900


def _split_text_at_sentence(text: str, max_len: int) -> list[str]:
    """Split text into chunks at sentence boundaries, respecting max_len."""
    if len(text) <= max_len:
        return [text]

    chunks = []
    remaining = text
    while remaining:
        if len(remaining) <= max_len:
            chunks.append(remaining)
            break

        # Try to split at last sentence boundary within limit
        cut_point = max_len
        for sep in [". ", "। ", "? ", "! ", "\n"]:
            idx = remaining[:max_len].rfind(sep)
            if idx > 0:
                cut_point = idx + len(sep)
                break

        chunks.append(remaining[:cut_point].strip())
        remaining = remaining[cut_point:].strip()

    return [c for c in chunks if c]


def synthesize_speech(text: str, language_code: str = "hi-IN") -> bytes:
    """Convert text to speech using Polly. Handles long text by chunking
    at sentence boundaries and concatenating the MP3 output."""
    voice_id = VOICE_MAP.get(language_code, "Kajal")
    chunks = _split_text_at_sentence(text, POLLY_CHAR_LIMIT)
    logger.info({"action": "synthesize", "chunks": len(chunks), "total_chars": len(text)})

    audio_parts = []
    for i, chunk in enumerate(chunks):
        try:
            resp = polly.synthesize_speech(
                Text=chunk,
                OutputFormat="mp3",
                VoiceId=voice_id,
                LanguageCode=language_code,
            )
            audio_parts.append(resp["AudioStream"].read())
        except Exception as e:
            logger.error({"action": "synthesize_chunk_error", "chunk_index": i, "error": str(e)})
            # Skip failed chunk rather than crashing the whole response
            continue

    if not audio_parts:
        raise RuntimeError("All Polly synthesis chunks failed")

    return b"".join(audio_parts)


def start_transcription_job(
    job_name: str,
    s3_uri: str,
    language_code: str = "hi-IN",
    media_format: str = "webm",
) -> None:
    logger.info({"action": "start_transcription", "job": job_name, "uri": s3_uri, "lang": language_code})
    transcribe.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={"MediaFileUri": s3_uri},
        MediaFormat=media_format,
        LanguageCode=language_code,
    )


def get_transcription_result(job_name: str, max_wait_seconds: int = 25) -> dict:
    """Poll for transcription result with a tight timeout suitable for Lambda.

    Uses 1-second intervals (not 2) and a configurable max wait (default 25s)
    to leave enough headroom for the agent call that follows.
    """
    import time
    import urllib.request
    import json as _json

    poll_interval = 1.0
    max_polls = int(max_wait_seconds / poll_interval)

    for attempt in range(max_polls):
        resp = transcribe.get_transcription_job(TranscriptionJobName=job_name)
        status = resp["TranscriptionJob"]["TranscriptionJobStatus"]

        if status == "COMPLETED":
            transcript_uri = resp["TranscriptionJob"]["Transcript"]["TranscriptFileUri"]
            with urllib.request.urlopen(transcript_uri) as r:
                data = _json.loads(r.read())
            text = data["results"]["transcripts"][0]["transcript"]
            logger.info({"action": "transcription_done", "job": job_name, "chars": len(text), "polls": attempt + 1})
            return {"status": "completed", "text": text}

        if status == "FAILED":
            reason = resp["TranscriptionJob"].get("FailureReason", "unknown")
            logger.error({"action": "transcription_failed", "job": job_name, "reason": reason})
            return {"status": "failed", "text": "", "reason": reason}

        time.sleep(poll_interval)

    logger.warning({"action": "transcription_timeout", "job": job_name, "waited_seconds": max_wait_seconds})
    return {"status": "timeout", "text": ""}
