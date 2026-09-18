"""
Sahai — Local tool tests (Phase 5 checkpoint)
Run each test independently before touching the orchestrator.

Usage:
  python quick_test.py                  # runs all 4 tests
  python quick_test.py eligibility      # runs one test by name
"""

import os
import sys

# Make sure KB_ID is set
if not os.environ.get("KB_ID"):
    print("ERROR: KB_ID env var not set. Run: export KB_ID=<your-bedrock-kb-id>")
    sys.exit(1)

from tools import eligibility_matcher, rejection_decoder, checklist_generator, application_drafter

TESTS = {
    "eligibility": (
        eligibility_matcher,
        ["35-year-old farmer in Bihar, owns 1.5 acres of land, no income tax, family of 4"],
        "eligibility_matcher",
    ),
    "rejection": (
        rejection_decoder,
        ["", "40yo farmer Bihar 2 acres", "PM-Kisan", "120"],
        "rejection_decoder (ghosted case)",
    ),
    "rejection_explicit": (
        rejection_decoder,
        [
            "Application rejected due to Aadhaar-bank account name mismatch.",
            "60yo widow Bihar",
            "PM-Kisan",
            "",
        ],
        "rejection_decoder (explicit rejection text)",
    ),
    "checklist": (
        checklist_generator,
        ["PM-Kisan Samman Nidhi"],
        "checklist_generator",
    ),
    "drafter": (
        application_drafter,
        [
            "PM-Kisan Samman Nidhi",
            "35yo farmer Bihar 1.5 acres",
            "Aadhaar name mismatch with bank account",
        ],
        "application_drafter",
    ),
}

def run_test(name: str):
    fn, args, label = TESTS[name]
    print(f"\n{'='*60}")
    print(f"TEST: {label}")
    print(f"{'='*60}")
    try:
        result = fn(*args)
        print(result[:1500] if len(str(result)) > 1500 else result)
        print(f"\n✅ PASS — got {len(str(result))} chars back")
    except Exception as e:
        print(f"\n❌ FAIL — {e}")
        raise

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    if target:
        if target not in TESTS:
            print(f"Unknown test '{target}'. Options: {list(TESTS.keys())}")
            sys.exit(1)
        run_test(target)
    else:
        for name in TESTS:
            run_test(name)
    print("\n\nAll tests done. If every test showed ✅, run: python orchestrator.py")
