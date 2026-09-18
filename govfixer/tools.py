import os
import json
import logging
import boto3
from strands import tool

logger = logging.getLogger("govfixer.tools")
logger.setLevel(logging.INFO)

bedrock_agent_runtime = boto3.client(
    "bedrock-agent-runtime",
    region_name=os.environ.get("AWS_REGION", "us-west-2"),
)


def _query_kb(query: str, num_results: int = 5) -> str:
    """Retrieve relevant chunks from Bedrock Knowledge Base.
    Returns raw KB text or a clear error message."""
    kb_id = os.environ.get("KB_ID", "")
    if not kb_id:
        return "[KB not configured — using fallback mode]"
    try:
        resp = bedrock_agent_runtime.retrieve(
            knowledgeBaseId=kb_id,
            retrievalQuery={"text": query},
            retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": num_results}},
        )
        chunks = [r["content"]["text"] for r in resp.get("retrievalResults", [])]
        if not chunks:
            return "[No matching scheme information found in knowledge base]"
        logger.info({"action": "kb_query", "query": query[:80], "results": len(chunks)})
        return "\n---\n".join(chunks)
    except Exception as e:
        logger.error({"action": "kb_query_error", "error": str(e)})
        return f"[Knowledge base lookup unavailable: {str(e)}]"


@tool
def eligibility_matcher(profile: str) -> str:
    """Given a citizen's profile (age, occupation, income, state, land holdings,
    family details), retrieves matching scheme eligibility data from the knowledge base.
    Returns structured results for the agent to interpret."""
    context = _query_kb(
        f"eligibility criteria required documents for schemes matching: {profile}"
    )
    return json.dumps({
        "tool": "eligibility_matcher",
        "profile": profile,
        "kb_results": context,
        "source": "bedrock_knowledge_base",
        "instruction": "Identify matching schemes and near-miss schemes with reasons based on kb_results."
    }, ensure_ascii=False)


@tool
def rejection_decoder(
    rejection_text: str,
    profile: str,
    scheme: str,
    days_since_applied: str = "",
) -> str:
    """Retrieves known rejection patterns for a scheme from the knowledge base.
    If rejection_text is empty and days_since_applied is provided, retrieves
    ghosted/silent application patterns instead.
    Returns structured data for the agent to explain in plain language."""
    if rejection_text.strip():
        context = _query_kb(
            f"{scheme} rejection reasons common issues: {rejection_text}"
        )
        return json.dumps({
            "tool": "rejection_decoder",
            "type": "explicit_rejection",
            "rejection_text": rejection_text,
            "scheme": scheme,
            "profile": profile,
            "kb_results": context,
            "source": "bedrock_knowledge_base",
            "instruction": "Explain the likely reason for this rejection in plain language and list fixes."
        }, ensure_ascii=False)

    ghost_context = _query_kb(
        f"{scheme} silent no response application stuck processing delay ghosted"
    )
    return json.dumps({
        "tool": "rejection_decoder",
        "type": "ghosted_application",
        "scheme": scheme,
        "profile": profile,
        "days_since_applied": days_since_applied,
        "kb_results": ghost_context,
        "source": "bedrock_knowledge_base",
        "instruction": "Label ALL reasons as 'probable cause' or 'likely reason' — not confirmed. List 2-3 most probable reasons and what to check."
    }, ensure_ascii=False)


@tool
def checklist_generator(scheme: str) -> str:
    """Retrieves the complete document checklist for a scheme from the knowledge base,
    including common mistakes. Returns structured data."""
    context = _query_kb(
        f"{scheme} required documents ranked common mistakes missing documents checklist"
    )
    return json.dumps({
        "tool": "checklist_generator",
        "scheme": scheme,
        "kb_results": context,
        "source": "bedrock_knowledge_base",
        "instruction": "Format as a numbered checklist ranked by how often people miss each item. Add one tip per item."
    }, ensure_ascii=False)


@tool
def application_drafter(scheme: str, profile: str, fixes: str) -> str:
    """Retrieves scheme application process details from the knowledge base.
    Returns structured data for the agent to draft a corrected action plan.
    The agent MUST include the Sahai disclaimer in the output."""
    context = _query_kb(
        f"{scheme} application requirements process steps where to apply"
    )
    return json.dumps({
        "tool": "application_drafter",
        "scheme": scheme,
        "profile": profile,
        "fixes_needed": fixes,
        "kb_results": context,
        "source": "bedrock_knowledge_base",
        "disclaimer": "This is a Sahai personal action plan — NOT an official government document.",
        "instruction": "Draft a step-by-step action plan: documents to collect, corrections, where to go, in what order. Include the disclaimer and helpline number."
    }, ensure_ascii=False)
