import os
import logging
import boto3

logger = logging.getLogger("govfixer.ocr")
logger.setLevel(logging.INFO)

textract = boto3.client("textract", region_name=os.environ.get("AWS_REGION", "us-west-2"))


def extract_text_from_image(s3_bucket: str, s3_key: str) -> str:
    """Extract text from an image stored in S3 using Amazon Textract."""
    logger.info({"action": "ocr_start", "bucket": s3_bucket, "key": s3_key})
    try:
        resp = textract.detect_document_text(
            Document={"S3Object": {"Bucket": s3_bucket, "Name": s3_key}}
        )
        lines = [b["Text"] for b in resp["Blocks"] if b["BlockType"] == "LINE"]
        result = "\n".join(lines)
        logger.info({"action": "ocr_done", "lines": len(lines), "chars": len(result)})
        return result
    except Exception as e:
        logger.error({"action": "ocr_error", "error": str(e)})
        raise
