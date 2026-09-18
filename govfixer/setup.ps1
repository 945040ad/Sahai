# Sahai AWS Resource Setup Script (PowerShell)
# Run once to provision all required AWS resources on Windows.
# Prerequisites: AWS CLI installed and configured (aws configure).

$ErrorActionPreference = "Stop"

$REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-west-2" }
$TEAM_SUFFIX = "govfixer2026"
$BUCKET_NAME = "govfixer-scheme-docs-$TEAM_SUFFIX"
$TABLE_NAME = "govfixer-sessions"
$LAMBDA_ROLE_NAME = "govfixer-lambda-role"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== Sahai AWS Setup (PowerShell) ===" -ForegroundColor Cyan
Write-Host "Region: $REGION"
Write-Host "Bucket: $BUCKET_NAME"

# --- 1. S3 ---
Write-Host "`n[1/5] Creating S3 bucket..." -ForegroundColor Yellow
try {
    aws s3 mb "s3://$BUCKET_NAME" --region $REGION
} catch {
    Write-Host "Bucket may already exist, continuing..."
}

$corsConfig = '{\"CORSRules\":[{\"AllowedHeaders\":[\"*\"],\"AllowedMethods\":[\"GET\",\"PUT\",\"POST\"],\"AllowedOrigins\":[\"*\"],\"MaxAgeSeconds\":3000}]}'
aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration "$corsConfig"

# --- 2. DynamoDB ---
Write-Host "`n[2/5] Creating DynamoDB table..." -ForegroundColor Yellow
try {
    aws dynamodb create-table `
      --table-name $TABLE_NAME `
      --attribute-definitions AttributeName=session_id,AttributeType=S `
      --key-schema AttributeName=session_id,KeyType=HASH `
      --billing-mode PAY_PER_REQUEST `
      --region $REGION
} catch {
    Write-Host "Table may already exist, continuing..."
}

# --- 3. IAM Role ---
Write-Host "`n[3/5] Creating IAM role..." -ForegroundColor Yellow
$trustPolicy = '{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}'
try {
    aws iam create-role --role-name $LAMBDA_ROLE_NAME --assume-role-policy-document "$trustPolicy"
} catch {
    Write-Host "Role may already exist, continuing..."
}

$policies = @(
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    "arn:aws:iam::aws:policy/AmazonBedrockFullAccess",
    "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
    "arn:aws:iam::aws:policy/AmazonS3FullAccess",
    "arn:aws:iam::aws:policy/AmazonTextractFullAccess",
    "arn:aws:iam::aws:policy/AmazonTranscribeFullAccess",
    "arn:aws:iam::aws:policy/AmazonPollyFullAccess"
)

foreach ($policy in $policies) {
    try {
        aws iam attach-role-policy --role-name $LAMBDA_ROLE_NAME --policy-arn "$policy"
    } catch {}
}

$LAMBDA_ROLE_ARN = aws iam get-role --role-name $LAMBDA_ROLE_NAME --query 'Role.Arn' --output text
Write-Host "Lambda Role ARN: $LAMBDA_ROLE_ARN" -ForegroundColor Green

# --- 4. Upload scheme docs ---
Write-Host "`n[4/5] Uploading scheme docs to S3..." -ForegroundColor Yellow
$schemesDir = Join-Path $SCRIPT_DIR "schemes"
aws s3 cp "$schemesDir" "s3://$BUCKET_NAME/schemes/" --recursive --region $REGION

# --- 5. Summary ---
Write-Host "`n[5/5] Setup complete! Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open AWS Console -> Bedrock -> Knowledge Bases (us-west-2)"
Write-Host "  2. Create Knowledge Base pointing to: s3://$BUCKET_NAME/schemes/"
Write-Host "  3. Copy your Knowledge Base ID"
Write-Host "  4. In PowerShell, run: `$env:KB_ID = '<your-kb-id>'"
Write-Host "  5. Deploy Lambda: .\govfixer\deploy.ps1"
Write-Host "`nLambda Role ARN: $LAMBDA_ROLE_ARN"
