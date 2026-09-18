# Sahai Lambda Deploy Script (PowerShell)
# Run after setup.ps1 and after setting $env:KB_ID.

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR

$REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-west-2" }
$LAMBDA_NAME = "govfixer-orchestrator"
$BUCKET_NAME = if ($env:BUCKET_NAME) { $env:BUCKET_NAME } else { "govfixer-scheme-docs-govfixer2026" }
$SESSIONS_TABLE = "govfixer-sessions"
$BEDROCK_MODEL_ID = if ($env:BEDROCK_MODEL_ID) { $env:BEDROCK_MODEL_ID } else { "us.anthropic.claude-sonnet-4-5" }
$KB_ID = $env:KB_ID

if (-not $KB_ID) {
    Write-Warning "KB_ID environment variable is not set! Set it with: `$env:KB_ID = '<your-kb-id>'"
}

$LAMBDA_ROLE_ARN = $env:LAMBDA_ROLE_ARN
if (-not $LAMBDA_ROLE_ARN) {
    $LAMBDA_ROLE_ARN = aws iam get-role --role-name govfixer-lambda-role --query 'Role.Arn' --output text
}

Write-Host "=== Packaging Sahai Lambda ===" -ForegroundColor Cyan
python package_lambda.py

if (-not (Test-Path "govfixer-lambda.zip")) {
    Write-Error "govfixer-lambda.zip was not created. Check python package_lambda.py output."
}

Write-Host "`n=== Deploying Lambda: $LAMBDA_NAME ===" -ForegroundColor Cyan
$functionCheck = aws lambda get-function --function-name $LAMBDA_NAME --region $REGION 2>&1

if ($LASTEXITCODE -ne 0 -or "$functionCheck" -match "ResourceNotFoundException") {
    Write-Host "Creating new Lambda function..." -ForegroundColor Yellow
    aws lambda create-function `
      --function-name $LAMBDA_NAME `
      --runtime python3.12 `
      --role $LAMBDA_ROLE_ARN `
      --handler lambda_handler.handler `
      --zip-file fileb://govfixer-lambda.zip `
      --timeout 300 `
      --memory-size 512 `
      --region $REGION `
      --environment "Variables={KB_ID=$KB_ID,BUCKET_NAME=$BUCKET_NAME,SESSIONS_TABLE=$SESSIONS_TABLE,BEDROCK_MODEL_ID=$BEDROCK_MODEL_ID}"
    Write-Host "Lambda created successfully." -ForegroundColor Green
} else {
    Write-Host "Updating existing Lambda code..." -ForegroundColor Yellow
    aws lambda update-function-code `
      --function-name $LAMBDA_NAME `
      --zip-file fileb://govfixer-lambda.zip `
      --region $REGION

    Write-Host "Waiting for update to finish..."
    aws lambda wait function-updated --function-name $LAMBDA_NAME --region $REGION

    Write-Host "Updating Lambda configuration..."
    aws lambda update-function-configuration `
      --function-name $LAMBDA_NAME `
      --timeout 300 `
      --memory-size 512 `
      --environment "Variables={KB_ID=$KB_ID,BUCKET_NAME=$BUCKET_NAME,SESSIONS_TABLE=$SESSIONS_TABLE,BEDROCK_MODEL_ID=$BEDROCK_MODEL_ID}" `
      --region $REGION
    Write-Host "Lambda updated successfully." -ForegroundColor Green
}

$LAMBDA_ARN = aws lambda get-function --function-name $LAMBDA_NAME --region $REGION --query 'Configuration.FunctionArn' --output text
Write-Host "Lambda ARN: $LAMBDA_ARN"

Write-Host "`n=== Configuring API Gateway ===" -ForegroundColor Cyan
$API_ID = aws apigatewayv2 get-apis --region $REGION --query "Items[?Name=='govfixer-api'].ApiId" --output text

if (-not $API_ID -or $API_ID -eq "None") {
    Write-Host "Creating new HTTP API Gateway..." -ForegroundColor Yellow
    $API_OUTPUT = aws apigatewayv2 create-api --name govfixer-api --protocol-type HTTP --region $REGION | ConvertFrom-Json
    $API_ID = $API_OUTPUT.ApiId
    $API_URL = $API_OUTPUT.ApiEndpoint

    aws apigatewayv2 create-integration `
      --api-id $API_ID `
      --integration-type AWS_PROXY `
      --integration-uri $LAMBDA_ARN `
      --payload-format-version "2.0" `
      --region $REGION | Out-Null

    $INTEGRATION_ID = aws apigatewayv2 get-integrations --api-id $API_ID --region $REGION --query 'Items[0].IntegrationId' --output text

    aws apigatewayv2 create-route --api-id $API_ID --route-key "POST /chat" --target "integrations/$INTEGRATION_ID" --region $REGION | Out-Null
    aws apigatewayv2 create-route --api-id $API_ID --route-key "OPTIONS /chat" --target "integrations/$INTEGRATION_ID" --region $REGION | Out-Null
    aws apigatewayv2 create-stage --api-id $API_ID --stage-name '$default' --auto-deploy --region $REGION | Out-Null

    try {
        aws lambda add-permission `
          --function-name $LAMBDA_NAME `
          --statement-id apigateway-invoke `
          --action lambda:InvokeFunction `
          --principal apigateway.amazonaws.com `
          --region $REGION
    } catch {}
} else {
    Write-Host "API Gateway already exists."
    $API_URL = aws apigatewayv2 get-apis --region $REGION --query "Items[?Name=='govfixer-api'].ApiEndpoint" --output text
}

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "Your Chat API URL: $API_URL/chat" -ForegroundColor Yellow
Write-Host "Update govfixer-frontend/js/config.js with this URL" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Green
