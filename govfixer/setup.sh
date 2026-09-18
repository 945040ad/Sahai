#!/bin/bash
# Sahai AWS Resource Setup Script
# Run once to provision all required AWS resources.
# Prerequisites: AWS CLI configured, correct region set.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Find aws CLI (homebrew or system)
if command -v aws &>/dev/null; then
  AWS_CMD="aws"
elif [ -x /opt/homebrew/bin/aws ]; then
  AWS_CMD="/opt/homebrew/bin/aws"
else
  echo "ERROR: AWS CLI not found. Install with: brew install awscli"
  exit 1
fi

echo "Using AWS CLI: $AWS_CMD"

REGION="us-west-2"
TEAM_SUFFIX="govfixer2026"   # change to your team name
BUCKET_NAME="govfixer-scheme-docs-${TEAM_SUFFIX}"
TABLE_NAME="govfixer-sessions"
LAMBDA_NAME="govfixer-orchestrator"
API_NAME="govfixer-api"
LAMBDA_ROLE_NAME="govfixer-lambda-role"

echo "=== Sahai AWS Setup ==="
echo "Region: $REGION"
echo "Bucket: $BUCKET_NAME"

# --- S3 ---
echo "[1/5] Creating S3 bucket..."
$AWS_CMD s3 mb s3://$BUCKET_NAME --region $REGION || echo "Bucket may already exist, skipping."
$AWS_CMD s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET","PUT","POST"],
    "AllowedOrigins": ["*"],
    "MaxAgeSeconds": 3000
  }]
}'

# --- DynamoDB ---
echo "[2/5] Creating DynamoDB table..."
$AWS_CMD dynamodb create-table \
  --table-name $TABLE_NAME \
  --attribute-definitions AttributeName=session_id,AttributeType=S \
  --key-schema AttributeName=session_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION || echo "Table may already exist, skipping."

# Enable TTL on session table (sessions auto-expire after 24h)
echo "  Enabling TTL on $TABLE_NAME..."
$AWS_CMD dynamodb update-time-to-live \
  --table-name $TABLE_NAME \
  --time-to-live-specification "Enabled=true, AttributeName=ttl" \
  --region $REGION 2>/dev/null || echo "  TTL may already be enabled, skipping."

# --- IAM Role ---
echo "[3/5] Creating IAM role..."
TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}'
$AWS_CMD iam create-role \
  --role-name $LAMBDA_ROLE_NAME \
  --assume-role-policy-document "$TRUST_POLICY" || echo "Role may already exist, skipping."

for POLICY in \
  "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" \
  "arn:aws:iam::aws:policy/AmazonBedrockFullAccess" \
  "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess" \
  "arn:aws:iam::aws:policy/AmazonS3FullAccess" \
  "arn:aws:iam::aws:policy/AmazonTextractFullAccess" \
  "arn:aws:iam::aws:policy/AmazonTranscribeFullAccess" \
  "arn:aws:iam::aws:policy/AmazonPollyFullAccess"; do
  $AWS_CMD iam attach-role-policy --role-name $LAMBDA_ROLE_NAME --policy-arn "$POLICY" || true
done

LAMBDA_ROLE_ARN=$($AWS_CMD iam get-role --role-name $LAMBDA_ROLE_NAME --query 'Role.Arn' --output text)
echo "Lambda Role ARN: $LAMBDA_ROLE_ARN"

# --- Upload scheme docs ---
echo "[4/5] Uploading scheme docs to S3..."
$AWS_CMD s3 cp "$SCRIPT_DIR/schemes/" s3://$BUCKET_NAME/schemes/ --recursive --region $REGION

echo "[5/5] Done. Next steps:"
echo "  1. Create Bedrock Knowledge Base in console (us-west-2), pointing to s3://$BUCKET_NAME/schemes/"
echo "  2. Note the Knowledge Base ID"
echo "  3. Run: export KB_ID=<your-kb-id>"
echo "  4. Run deploy.sh to package and deploy Lambda"
echo ""
echo "Lambda Role ARN (needed for deploy.sh): $LAMBDA_ROLE_ARN"
