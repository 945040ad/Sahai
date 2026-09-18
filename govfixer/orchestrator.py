import os
import logging
from strands import Agent
from strands.models import BedrockModel
from tools import eligibility_matcher, rejection_decoder, checklist_generator, application_drafter

logger = logging.getLogger("govfixer.orchestrator")
logger.setLevel(logging.INFO)

SYSTEM_PROMPT = """You are Sahai, a calm and helpful guide for Indian citizens navigating government welfare scheme applications. You speak simply, clearly, and with care.

When a user describes their situation, use your tools in this order:
1. Use eligibility_matcher to find matching schemes for their profile.
2. If they mention a rejection or no response, use rejection_decoder to explain what likely went wrong.
3. Use checklist_generator to show exactly what documents they need.
4. Use application_drafter to create a personal action plan for re-applying.

How to read tool results:
- Tools return structured data from the government scheme knowledge base.
- Use the "kb_results" field as your primary source of truth — do NOT invent eligibility rules.
- Present information in the user's language. If they write in Hindi, respond in Hindi.

Rules you must always follow:
- Never claim certainty about a rejection reason you're inferring. Say "likely" or "probable cause".
- Never format any output to look like an official government document or form.
- Always label drafted plans as Sahai's personal action plan, not official communication.
- If the user writes in Hindi or a regional language, respond in the same language.
- Keep your tone reassuring — the user is often frustrated or confused.
- Always end your response with the relevant helpline number if available.
"""

MODEL_ID = os.environ.get(
    "BEDROCK_MODEL_ID",
    "us.anthropic.claude-sonnet-4-5",   # cross-region inference; change to your approved model
)

TOOLS = [eligibility_matcher, rejection_decoder, checklist_generator, application_drafter]


def _make_model():
    return BedrockModel(
        model_id=MODEL_ID,
        region_name=os.environ.get("AWS_REGION", "us-west-2"),
    )


def build_agent_with_history(history: list[dict]) -> Agent:
    """Return a **fresh** agent per request, optionally pre-seeded with conversation context.

    Always creates a new Agent instance to avoid state leaking between
    concurrent Lambda invocations that share a warm container.
    """
    if not history:
        return Agent(
            model=_make_model(),
            system_prompt=SYSTEM_PROMPT,
            tools=TOOLS,
        )

    # Inject the last 6 turns (12 messages) — aligned with what we store in DynamoDB
    history_text = "\n".join(
        f"[{m['role'].upper()}]: {m['content']}" for m in history[-12:]
    )
    context_injection = (
        f"\n\n[Previous conversation context — use this to understand the user's ongoing situation]\n"
        f"{history_text}\n\n[End of context — now respond to the latest message below]\n"
    )
    contextual_prompt = SYSTEM_PROMPT + context_injection

    return Agent(
        model=_make_model(),
        system_prompt=contextual_prompt,
        tools=TOOLS,
    )


if __name__ == "__main__":
    print("Sahai local test — type your situation below (Ctrl+C to quit)\n")
    agent = build_agent_with_history([])
    while True:
        try:
            user_input = input("You: ").strip()
            if not user_input:
                continue
            response = agent(user_input)
            print(f"\nSahai: {response}\n")
        except KeyboardInterrupt:
            print("\nBye.")
            break
