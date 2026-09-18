#!/bin/bash
# Sahai Lambda Deploy Script
# Run after setup.sh and after setting KB_ID env var.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

REGION="us-west-2"
LAMBDA_NAME="govfixer-orchestrator"
LAMBDA_ROLE_ARN="${LAMBDA_ROLE_ARN:-}"   # pass via env or hardcode after setup.sh
KB_ID="${KB_ID:-}"
BUCKET_NAME="${BUCKET_NAME:-govfixer-scheme-docs-govfixer2026}"
SESSIONS_TABLE="govfixer-sessions"
BEDROCK_MODEL_ID="${BEDROCK_MODEL_ID:-us.anthropic.claude-sonnet-4-5}"

if [ -z "$LAMBDA_ROLE_ARN" ]; then
  LAMBDA_ROLE_ARN=$(aws iam get-role --role-name govfixer-lambda-role --query 'Role.Arn' --output text)
fi

echo "Packaging Lambda..."
rm -rf package govfixer-lambda.zip
pip install --quiet --target ./package strands-agents strands-agents-tools boto3

cd package
zip -r ../govfixer-lambda.zip . -x "*.dist-info/*" -x "__pycache__/*" > /dev/null
cd ..

zip -g govfixer-lambda.zip lambda_handler.py orchestrator.py tools.py voice.py ocr.py

echo "Deploying Lambda..."
FUNCTION_EXISTS=$(aws lambda get-function --function-name $LAMBDA_NAME --region $REGION 2>&1 || true)

if echo "$FUNCTION_EXISTS" | grep -q "ResourceNotFoundException"; then
  aws lambda create-function \
    --function-name $LAMBDA_NAME \
    --runtime python3.12 \
    --role $LAMBDA_ROLE_ARN \
    --handler lambda_handler.handler \
    --zip-file fileb://govfixer-lambda.zip \
    --timeout 300 \
    --memory-size 512 \
    --region $REGION \
    --environment "Variables={KB_ID=${KB_ID},BUCKET_NAME=${BUCKET_NAME},SESSIONS_TABLE=${SESSIONS_TABLE},BEDROCK_MODEL_ID=${BEDROCK_MODEL_ID}}"
  echo "Lambda created."
else
  aws lambda update-function-code \
    --function-name $LAMBDA_NAME \
    --zip-file fileb://govfixer-lambda.zip \
    --region $REGION
  # Wait for code update to complete before changing config
  aws lambda wait function-updated --function-name $LAMBDA_NAME --region $REGION
  aws lambda update-function-configuration \
    --function-name $LAMBDA_NAME \
    --timeout 300 \
    --memory-size 512 \
    --environment "Variables={KB_ID=${KB_ID},BUCKET_NAME=${BUCKET_NAME},SESSIONS_TABLE=${SESSIONS_TABLE},BEDROCK_MODEL_ID=${BEDROCK_MODEL_ID}}" \
    --region $REGION
  echo "Lambda updated."
fi

LAMBDA_ARN=$(aws lambda get-function --function-name $LAMBDA_NAME --region $REGION --query 'Configuration.FunctionArn' --output text)
echo "Lambda ARN: $LAMBDA_ARN"

API_EXISTS=$(aws apigatewayv2 get-apis --region $REGION --query "Items[?Name=='govfixer-api'].ApiId" --output text)

if [ -z "$API_EXISTS" ]; then
  echo "Creating API Gateway..."
  API_OUTPUT=$(aws apigatewayv2 create-api \
    --name govfixer-api \
    --protocol-type HTTP \
    --region $REGION)
  API_ID=$(echo $API_OUTPUT | python3 -c "import sys,json; print(json.load(sys.stdin)['ApiId'])")
  API_URL=$(echo $API_OUTPUT | python3 -c "import sys,json; print(json.load(sys.stdin)['ApiEndpoint'])")

  aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri $LAMBDA_ARN \
    --payload-format-version "2.0" \
    --region $REGION

  INTEGRATION_ID=$(aws apigatewayv2 get-integrations --api-id $API_ID --region $REGION --query 'Items[0].IntegrationId' --output text)

  aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key "POST /chat" \
    --target "integrations/$INTEGRATION_ID" \
    --region $REGION

  # OPTIONS route so browser CORS preflight doesn't 403
  aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key "OPTIONS /chat" \
    --target "integrations/$INTEGRATION_ID" \
    --region $REGION

  aws apigatewayv2 create-stage \
    --api-id $API_ID \
    --stage-name '$default' \
    --auto-deploy \
    --region $REGION

  aws lambda add-permission \
    --function-name $LAMBDA_NAME \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --region $REGION || true

  echo "API URL: $API_URL/chat"
else
  echo "API Gateway already exists."
  API_URL=$(aws apigatewayv2 get-apis --region $REGION --query "Items[?Name=='govfixer-api'].ApiEndpoint" --output text)
  echo "API URL: $API_URL/chat"
fi
