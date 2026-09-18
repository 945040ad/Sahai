// ============================================================
// Sahai — Application Logic
// ============================================================

const API_URL = (typeof CONFIG !== "undefined" && CONFIG.API_URL) || "";
const API_CONFIGURED = API_URL && !API_URL.includes("YOUR_API_GATEWAY_URL");
const DEMO_MODE = (typeof CONFIG !== "undefined" && CONFIG.DEMO_MODE) || false;

// --- Demo Mode Mock Responses ---

const DEMO_RESPONSES = {
  "pm-kisan-ghosted": {
    response: `## Probable Reason for No Response

Based on your description, here are the most likely reasons your PM-Kisan application has been stuck for 4 months:

### Probable Cause 1: State-Level Verification Pending
Your application is likely stuck in the **state nodal officer verification queue**. In Bihar, this backlog can take 3 to 6 months during peak periods. This is the most common reason for applications with no response.

### Probable Cause 2: Aadhaar-Bank Account Mismatch
If your name on Aadhaar does not **exactly match** your bank account (even a small spelling difference), the system silently blocks the application without sending a rejection.

### Probable Cause 3: Land Records Not Digitally Updated
Your land ownership may exist in local patwari records but has not been synced with the PM-Kisan digital portal.

---

## What To Do Now

1. **Check your status** at pmkisan.gov.in, go to Farmers Corner, then Beneficiary Status
2. **Visit your Block Development Office** with your Aadhaar and land Khatoni. Ask the nodal officer to check your verification status
3. **Verify Aadhaar-bank link** at your bank branch. Confirm the name and seeding status
4. **Call the helpline**: 155261 or 011-24300606

> This is a Sahai action plan, not official government advice.`,
    session_id: "demo-session",
  },
  "pmay-rejected": {
    response: `## PM Awas Yojana: Understanding Your Rejection

Since you did not receive a specific reason, here are the most common rejection causes for PMAY-Gramin in Bihar:

### Most Likely: SECC Data Mismatch
PMAY-G uses the **Socio-Economic Caste Census (SECC-2011)** data to identify beneficiaries. If your family's name is not in the SECC housing deprivation list, the application is automatically rejected. This is the number one cause.

### Also Common: Income or Housing Status
- You or your spouse already own a **pucca house** (permanent structure) anywhere
- Family income was recorded as above the threshold in SECC data
- Another family member already received PMAY benefit

---

## Required Documents (ranked by how often applicants miss them)

1. **SECC inclusion proof**: check at pmayg.nic.in using your Aadhaar
2. **Aadhaar card**: must match Gram Panchayat records exactly
3. **Bank account linked to Aadhaar** (DBT-enabled)
4. **BPL/income certificate** from Block office
5. **No-pucca-house certificate** from Mukhiya/Sarpanch
6. **Land ownership/allotment document** for the plot where house will be built

---

## Action Plan

1. **First**, go to pmayg.nic.in and check if your name is in the SECC list
2. **If not in SECC**, apply for Awaas+ (additional beneficiary list) through your Gram Panchayat
3. **If in SECC**, visit Block Development Office with all 6 documents above and request re-verification
4. **Helpline**: 1800-11-6446 (toll-free)

> This is a Sahai action plan, not official government advice.`,
    session_id: "demo-session",
  },
  "ayushman-denied": {
    response: `## Ayushman Bharat (PMJAY): Hospital Denial Explained

Being denied at the hospital is unfortunately common. Here is what likely happened:

### Most Common Reason: Not in the SECC/Beneficiary List
Ayushman Bharat eligibility is based on the **SECC-2011 survey data**. If your family was not identified as a deprived household in that survey, you will not have an Ayushman card, even if your current income qualifies you.

### Other Possible Reasons
- **Aadhaar authentication failed** at the hospital kiosk (biometric did not match)
- **Hospital is not empanelled** under PMJAY for the specific procedure
- **Card not activated**: you have eligibility but never completed e-KYC
- **Treatment not covered**: some procedures and conditions are excluded

---

## Step-by-Step Fix

1. **Check eligibility**: call 14555 or visit pmjay.gov.in, then select "Am I Eligible?" and enter your mobile or Aadhaar number
2. **If eligible but no card**: visit your nearest Common Service Centre (CSC) with Aadhaar and ration card to get the card printed (free of charge)
3. **If not eligible**: apply through your District Collector's office for inclusion under the state supplementary list
4. **For Aadhaar issues**: visit your nearest Aadhaar centre and update biometrics

**Helpline**: 14555 (toll-free, 24x7)

> This is a Sahai action plan, not official government advice.`,
    session_id: "demo-session",
  },
  "eligibility": {
    response: `## Schemes You Likely Qualify For

Based on your profile (60-year-old farmer, Bihar), here are the schemes you are most likely eligible for:

### Strongly Eligible

| # | Scheme | Benefit | Why You Qualify |
|---|--------|---------|----------------|
| 1 | **PM-Kisan Samman Nidhi** | Rs 6,000/year | Farmer with cultivable land |
| 2 | **IGNOAPS (Old Age Pension)** | Rs 400-500/month | Age 60+, BPL household |
| 3 | **PMJJBY (Life Insurance)** | Rs 2 lakh cover | Age-eligible (18-55), Rs 436/year premium |
| 4 | **PMSBY (Accidental Insurance)** | Rs 2 lakh cover | Rs 20/year auto-debit from bank |
| 5 | **Ayushman Bharat (PMJAY)** | Rs 5 lakh health cover | If in SECC deprivation list |
| 6 | **PM Ujjwala Yojana** | Free LPG connection | BPL household (check wife/daughter eligibility) |

### Possibly Eligible (Verify)

| # | Scheme | What to Check |
|---|--------|---------------|
| 7 | **PM Awas Yojana, Gramin** | Must not own a pucca house; must be in SECC list |
| 8 | **MGNREGA** | Any rural household can apply for 100 days of wage employment |

### Next Steps
1. Start with **PM-Kisan** (if not already enrolled) and **IGNOAPS pension** as these are the most straightforward
2. Visit your **Block Development Office** with Aadhaar, land records, and age proof
3. For PMJAY, call **14555** to check SECC eligibility

> This is a Sahai action plan, not official government advice.`,
    session_id: "demo-session",
  },
  "photo-rejection": {
    response: `## Rejection Letter Analysis

From the text extracted from your photo, this appears to be a rejection related to **document verification failure**.

### What This Rejection Means

Your application was rejected because the system could not verify one or more of your submitted documents. This typically happens when:

1. **Name mismatch**: your name on the application does not exactly match your Aadhaar or land records
2. **Expired or invalid document**: one of the submitted documents may have been expired or not in the accepted format
3. **Incomplete upload**: a required document page was missing or unreadable

### How to Fix This

1. **Collect all original documents**: Aadhaar, land records (Khatoni), bank passbook, income certificate
2. **Check name spellings** carefully across all documents. Even one letter difference causes rejection
3. **Get fresh copies** if any document is older than 6 months
4. **Re-apply** with clear scans or photos of all documents

> This is a Sahai action plan, not official government advice.`,
    extracted_text: "Application ID: BH-2026-PM-449821\nStatus: REJECTED\nReason: Document verification failed. Submitted documents could not be verified against government records.\nDate: 15-Sep-2026",
    session_id: "demo-session",
  },
  "default": {
    response: `Thank you for sharing your situation. Let me help you understand what is happening and what you can do.

Based on what you have described, I recommend these steps:

1. **Check your application status** on the official scheme portal
2. **Gather your key documents**: Aadhaar card, income certificate, and any scheme-specific documents
3. **Visit your nearest Common Service Centre (CSC)** or Block Development Office for in-person help

You can ask me to:
- **Check which schemes you are eligible for** (share your age, occupation, income, and state)
- **Get the document checklist** for a specific scheme
- **Explain a rejection** you received

> This is a Sahai action plan, not official government advice.`,
    session_id: "demo-session",
  },
};

function getDemoResponse(message) {
  const msg = message.toLowerCase();
  if (msg.includes("pm-kisan") && (msg.includes("no response") || msg.includes("ghosted") || msg.includes("not received"))) {
    return DEMO_RESPONSES["pm-kisan-ghosted"];
  }
  if (msg.includes("awas") || msg.includes("pmay")) {
    return DEMO_RESPONSES["pmay-rejected"];
  }
  if (msg.includes("ayushman") || msg.includes("hospital")) {
    return DEMO_RESPONSES["ayushman-denied"];
  }
  if (msg.includes("eligible") || msg.includes("scheme") || msg.includes("farmer") || msg.includes("60 year")) {
    return DEMO_RESPONSES["eligibility"];
  }
  return DEMO_RESPONSES["default"];
}

function getDemoPhotoResponse() {
  return DEMO_RESPONSES["photo-rejection"];
}

async function simulateDelay(ms = 1500) {
  return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 800));
}

// --- Setup Banner ---

function showSetupBanner() {
  const banner = document.createElement("div");
  banner.style.cssText = `
    position:fixed; top:0; left:0; right:0; z-index:999;
    background:#c53030; color:#fff; font-size:0.82rem; font-weight:600;
    text-align:center; padding:8px 20px; font-family:inherit;
  `;
  banner.textContent = "Setup required: open js/config.js and set your API Gateway URL.";
  document.body.prepend(banner);
}

function showDemoBadge() {
  const badge = document.getElementById("demo-badge");
  if (badge) badge.style.display = "inline-block";
}

if (DEMO_MODE) {
  window.addEventListener("DOMContentLoaded", showDemoBadge);
} else if (!API_CONFIGURED) {
  window.addEventListener("DOMContentLoaded", showSetupBanner);
}

// --- State ---
let sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let currentLanguage = "en-IN";
let isLoading = false;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let heroVisible = true;
let _lastBlobUrl = null;

// --- DOM refs ---
const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const micBtn = document.getElementById("mic-btn");
const photoInput = document.getElementById("photo-input");
const heroEl = document.getElementById("hero");
const statusDot = document.getElementById("status-dot");
const responseAudio = document.getElementById("response-audio");

// --- Utilities ---

function hideHero() {
  if (!heroVisible) return;
  heroVisible = false;
  heroEl.classList.add("hidden");
}

function setStatus(state) {
  statusDot.className = `status-dot ${state === "ok" ? "" : state}`;
}

function toast(msg, type = "info") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
  setTimeout(() => { messagesEl.scrollTop = messagesEl.scrollHeight; }, 80);
}

// --- Markdown renderer ---

function renderMarkdown(text) {
  let codeBlocks = [];
  text = text.replace(/```[\s\S]*?```/g, m => {
    codeBlocks.push(`<pre><code>${m.replace(/```\w*/g,"").trim()}</code></pre>`);
    return `%%CODEBLOCK_${codeBlocks.length - 1}%%`;
  });

  text = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  text = text
    .replace(/^#{3}\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^#{2}\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^#{1}\s+(.+)$/gm, "<h3>$1</h3>");

  // Tables
  text = text.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm, (match, header, sep, body) => {
    const headers = header.split("|").filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join("");
    const rows = body.trim().split("\n").map(row => {
      const cells = row.split("|").filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // Blockquotes
  text = text.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  // Lists
  const lines = text.split("\n");
  let inList = false;
  let listType = null;
  const processed = [];

  for (const line of lines) {
    const ulMatch = line.match(/^[\*\-]\s+(.+)$/);
    const olMatch = line.match(/^(\d+)\.\s+(.+)$/);

    if (ulMatch) {
      if (!inList || listType !== "ul") {
        if (inList) processed.push(listType === "ul" ? "</ul>" : "</ol>");
        processed.push("<ul>");
        inList = true;
        listType = "ul";
      }
      processed.push(`<li>${ulMatch[1]}</li>`);
    } else if (olMatch) {
      if (!inList || listType !== "ol") {
        if (inList) processed.push(listType === "ul" ? "</ul>" : "</ol>");
        processed.push("<ol>");
        inList = true;
        listType = "ol";
      }
      processed.push(`<li>${olMatch[2]}</li>`);
    } else {
      if (inList) {
        processed.push(listType === "ul" ? "</ul>" : "</ol>");
        inList = false;
        listType = null;
      }
      processed.push(line);
    }
  }
  if (inList) processed.push(listType === "ul" ? "</ul>" : "</ol>");

  text = processed.join("\n");

  text = text.replace(/^---$/gm, "<hr/>");
  text = text.replace(/\n{2,}/g, "</p><p>");
  text = text.replace(/\n/g, "<br/>");

  if (text && !text.match(/^<[hupoltb]/)) {
    text = "<p>" + text;
  }

  codeBlocks.forEach((block, i) => {
    text = text.replace(`%%CODEBLOCK_${i}%%`, block);
  });

  // Action plan box
  text = text.replace(/╔[\s\S]*?╚[^\n]*\n?/g, (m) => {
    return `<div class="action-plan-box">
      <div class="plan-header">Sahai Action Plan</div>
      ${m.replace(/[╔║╚═╗╝]/g, "").trim()}
      <div class="action-plan-disclaimer">Personal action plan only. Not an official government document.</div>
    </div>`;
  });

  return text;
}

// --- Message rendering ---

function addMessage(role, content, extras = {}) {
  hideHero();

  const row = document.createElement("div");
  row.className = `msg-row ${role}`;

  const avatar = document.createElement("div");
  avatar.className = `avatar ${role}`;
  avatar.textContent = role === "agent" ? "S" : "You";

  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.innerHTML = renderMarkdown(content);

  if (extras.imageDataUrl) {
    const prev = document.createElement("div");
    prev.className = "photo-preview";
    prev.innerHTML = `<img src="${extras.imageDataUrl}" alt="Uploaded document" />
                      <span>Uploaded rejection letter</span>`;
    bubble.prepend(prev);
  }

  if (extras.extractedText) {
    const extBox = document.createElement("div");
    extBox.className = "extracted-text-box";
    extBox.textContent = `Extracted text: "${extras.extractedText.slice(0, 300)}"`;
    bubble.appendChild(extBox);
  }

  if (extras.audioUrl) {
    const audioBar = document.createElement("div");
    audioBar.className = "audio-bar";
    audioBar.innerHTML = `
      <button title="Play audio">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </button>
      <span>Listen to response</span>`;
    const playBtn = audioBar.querySelector("button");
    playBtn.addEventListener("click", () => {
      if (responseAudio.src === extras.audioUrl && !responseAudio.paused) {
        responseAudio.pause();
      } else {
        responseAudio.src = extras.audioUrl;
        responseAudio.play().catch(() => {});
      }
    });
    bubble.appendChild(audioBar);
  }

  row.appendChild(avatar);
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  scrollToBottom();
  return row;
}

function addTypingIndicator() {
  const row = document.createElement("div");
  row.className = "msg-row agent typing-row";
  row.id = "typing-indicator";

  const avatar = document.createElement("div");
  avatar.className = "avatar agent";
  avatar.textContent = "S";

  const dots = document.createElement("div");
  dots.className = "typing-dots";
  dots.innerHTML = "<span></span><span></span><span></span>";

  row.appendChild(avatar);
  row.appendChild(dots);
  messagesEl.appendChild(row);
  scrollToBottom();
  return row;
}

function removeTypingIndicator() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

// --- API calls ---

async function sendText(message, voiceResponse = false) {
  if (DEMO_MODE) {
    await simulateDelay(1800);
    return getDemoResponse(message);
  }

  const payload = {
    session_id: sessionId,
    type: "text",
    message,
    language: currentLanguage,
    voice_response: voiceResponse || currentLanguage.startsWith("hi"),
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 429) throw new Error("Too many requests. Please wait a moment and try again.");
  if (res.status === 503 || res.status === 504) throw new Error("Service temporarily unavailable. Please try again.");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (HTTP ${res.status})`);
  }
  return res.json();
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      resolve(typeof dataUrl === "string" ? dataUrl.split(",")[1] : "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function sendVoice(audioBlob, audioFormat = "webm") {
  if (DEMO_MODE) {
    await simulateDelay(2500);
    const resp = getDemoResponse("I applied for PM-Kisan 4 months ago and got no response");
    resp.transcribed = "मैंने चार महीने पहले पीएम किसान के लिए अप्लाई किया था लेकिन कोई जवाब नहीं आया";
    return resp;
  }

  const base64 = await blobToBase64(audioBlob);
  const payload = {
    session_id: sessionId,
    type: "voice",
    audio_data: base64,
    format: audioFormat,
    language: currentLanguage,
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 429) throw new Error("Too many requests. Please wait.");
  if (res.status === 503 || res.status === 504) throw new Error("Service temporarily unavailable.");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (HTTP ${res.status})`);
  }
  return res.json();
}

async function sendPhoto(file) {
  if (DEMO_MODE) {
    await simulateDelay(2000);
    return getDemoPhotoResponse();
  }

  const base64 = await blobToBase64(file);
  const payload = {
    session_id: sessionId,
    type: "photo",
    image_data: base64,
    language: currentLanguage,
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 429) throw new Error("Too many requests. Please wait.");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (HTTP ${res.status})`);
  }
  return res.json();
}

// --- Main send flow ---

async function handleSend(message, extras = {}) {
  if (isLoading) return;

  if (!DEMO_MODE && !API_CONFIGURED) {
    addMessage("agent", "**Setup needed.** Open js/config.js and set your API Gateway URL, or set DEMO_MODE to true.");
    return;
  }

  isLoading = true;
  sendBtn.disabled = true;
  setStatus("loading");
  addTypingIndicator();

  try {
    let data;

    if (extras.file) {
      data = await sendPhoto(extras.file);
      removeTypingIndicator();
      addMessage("agent", data.response, {
        extractedText: data.extracted_text,
        audioUrl: data.audio_url,
      });
    } else {
      data = await sendText(message);
      removeTypingIndicator();
      addMessage("agent", data.response, { audioUrl: data.audio_url });
    }

    if (data.session_id) sessionId = data.session_id;
    setStatus("ok");
  } catch (err) {
    removeTypingIndicator();
    console.error(err);
    setStatus("error");
    addMessage("agent", `Something went wrong: **${err.message}**\n\nPlease try again.`);
    toast(err.message, "error");
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
  }
}

// --- Voice recording ---

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];

    let mimeType = "audio/webm";
    let audioFormat = "webm";

    if (window.MediaRecorder && typeof MediaRecorder.isTypeSupported === "function") {
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4"; audioFormat = "mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg"; audioFormat = "ogg";
        } else {
          mimeType = ""; audioFormat = "mp4";
        }
      }
    }

    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(audioChunks, { type: mimeType || "audio/webm" });
      addMessage("user", "Voice message sent");

      isLoading = true;
      sendBtn.disabled = true;
      setStatus("loading");
      addTypingIndicator();

      try {
        const data = await sendVoice(blob, audioFormat);
        removeTypingIndicator();

        if (data.transcribed) {
          addMessage("user", `Transcribed: "${data.transcribed}"`);
        }

        addMessage("agent", data.response, { audioUrl: data.audio_url });

        if (data.audio_url) {
          responseAudio.src = data.audio_url;
          responseAudio.play().catch(() => {});
        }

        if (data.session_id) sessionId = data.session_id;
        setStatus("ok");
      } catch (err) {
        removeTypingIndicator();
        setStatus("error");
        addMessage("agent", `Voice processing failed: **${err.message}**`);
      } finally {
        isLoading = false;
        sendBtn.disabled = false;
      }
    };
    mediaRecorder.start();
    isRecording = true;
    micBtn.classList.add("recording");
    toast("Recording. Click mic again to stop.", "info");
  } catch (err) {
    toast("Microphone access denied or not available", "error");
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  isRecording = false;
  micBtn.classList.remove("recording");
}

// --- Event listeners ---

sendBtn.addEventListener("click", () => {
  const msg = inputEl.value.trim();
  if (!msg || isLoading) return;
  addMessage("user", msg);
  inputEl.value = "";
  autoResize(inputEl);
  handleSend(msg);
});

inputEl.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

inputEl.addEventListener("input", () => autoResize(inputEl));

micBtn.addEventListener("click", () => {
  if (isRecording) { stopRecording(); } else { startRecording(); }
});

photoInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  if (_lastBlobUrl) URL.revokeObjectURL(_lastBlobUrl);
  const blobUrl = URL.createObjectURL(file);
  _lastBlobUrl = blobUrl;

  addMessage("user", "Rejection letter photo uploaded", { imageDataUrl: blobUrl });
  photoInput.value = "";
  handleSend("", { file });
});

document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const prompt = chip.dataset.prompt;
    addMessage("user", prompt);
    handleSend(prompt);
  });
});

document.querySelectorAll(".lang-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".lang-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentLanguage = btn.dataset.lang;
    inputEl.placeholder = currentLanguage === "hi-IN"
      ? "अपनी स्थिति बताएं..."
      : "Describe your situation...";
  });
});

// --- Init ---
setStatus("ok");

// --- Dark mode toggle ---
const themeToggle = document.getElementById("theme-toggle");
const sunIcon = document.getElementById("theme-icon-sun");
const moonIcon = document.getElementById("theme-icon-moon");

function updateThemeIcon() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  sunIcon.style.display = isDark ? "none" : "block";
  moonIcon.style.display = isDark ? "block" : "none";
}

themeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("sahai-theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("sahai-theme", "dark");
  }
  updateThemeIcon();
});

updateThemeIcon();
