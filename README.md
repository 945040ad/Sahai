# Sahai

**Voice-first, multilingual AI agent that explains government scheme rejections and guides Indian citizens back to a successful application.**

Built for AWS First Commit Hackathon 2026.

---

## The Problem

Millions of Indians apply for welfare schemes every year. Many are rejected — or simply ghosted — with no explanation. The moment they hit that wall, after all the effort they put in, there's almost no help available in their language, at their level.

Sahai is built for *that* moment.

---

## What It Does

A citizen speaks (or types, or photographs a rejection SMS) → Sahai:

1. **Explains** why the application was likely rejected in plain language
2. **Lists** exactly what documents are missing or wrong
3. **Generates** a corrected application action plan in their own language
4. **Matches** them to other schemes they might qualify for

---

## AWS Stack

| Service | Role |
|---|---|
| **Amazon Bedrock** (Claude Sonnet) | Orchestration + reasoning |
| **Bedrock Strands Agents SDK** | Agent + 4 tools |
| **Bedrock Knowledge Bases + OpenSearch** | RAG over real scheme docs (no hallucination) |
| **Amazon Transcribe** | Hindi/English speech-to-text |
| **Amazon Polly** | Hindi/English text-to-speech |
| **Amazon Textract** | OCR for rejection letter photos |
| **AWS Lambda** | Serverless backend |
| **Amazon API Gateway** | HTTP endpoint |
| **Amazon DynamoDB** | Session state |
| **Amazon S3** | Scheme docs + audio files |
| **AWS Amplify** | Frontend hosting |

---

## Schemes Covered (Bihar focus — 12 schemes)

1. PM-Kisan Samman Nidhi
2. PM Awas Yojana – Gramin
3. Ayushman Bharat – PMJAY
4. PMEGP (employment generation)
5. PM SVANidhi (street vendors)
6. PMJJBY (life insurance)
7. IGNOAPS (old age pension)
8. MGNREGA (rural employment)
9. Bihar MKUY Scholarship (girl students)
10. Bihar SC/ST Civil Services Coaching
11. PM Ujjwala Yojana (clean cooking fuel)
12. PMSBY (accidental insurance)

---

## Local Setup

### On Windows (PowerShell):
```powershell
cd govfixer
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
aws configure
```

### On macOS / Linux:
```bash
cd govfixer
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
aws configure
```

---

## AWS Resource Provisioning

### On Windows (PowerShell):
```powershell
.\govfixer\setup.ps1
# Then in AWS Console: create Bedrock Knowledge Base (pointing to s3://govfixer-scheme-docs-govfixer2026/schemes/)
$env:KB_ID = "<your-kb-id>"
.\govfixer\deploy.ps1
```

### On macOS / Linux:
```bash
bash govfixer/setup.sh
# Then in AWS Console: create Bedrock Knowledge Base (pointing to s3://govfixer-scheme-docs-govfixer2026/schemes/)
export KB_ID="<your-kb-id>"
bash govfixer/deploy.sh
```

---

## Frontend Deployment

1. Open `govfixer-frontend/js/config.js` and set `CONFIG.API_URL = "https://<your-api-id>.execute-api.us-west-2.amazonaws.com/chat"`.
2. Deploy to AWS Amplify:
   - **Option A (Instant)**: Drag and drop the `govfixer-frontend` directory into [AWS Amplify Console](https://console.aws.amazon.com/amplify/) -> Deploy without Git.
   - **Option B (CLI)**: If Amplify CLI is installed: `amplify init && amplify add hosting && amplify publish`.

---

## Important Disclaimer

Sahai outputs are guidance only — not official government advice. All drafted action plans are clearly labeled as personal preparation documents, never as official government communications.

---

## Team

Built at AWS First Commit Hackathon 2026.
