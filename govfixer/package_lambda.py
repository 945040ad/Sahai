import os
import sys
import shutil
import zipfile
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PACKAGE_DIR = os.path.join(SCRIPT_DIR, "package")
ZIP_PATH = os.path.join(SCRIPT_DIR, "govfixer-lambda.zip")
PY_FILES = [
    "lambda_handler.py",
    "orchestrator.py",
    "tools.py",
    "voice.py",
    "ocr.py",
]

def build_package():
    print(f"Building Sahai Lambda package in {SCRIPT_DIR}...")
    if os.path.exists(PACKAGE_DIR):
        shutil.rmtree(PACKAGE_DIR)
    if os.path.exists(ZIP_PATH):
        os.remove(ZIP_PATH)

    os.makedirs(PACKAGE_DIR, exist_ok=True)

    print("Installing dependencies into package directory...")
    cmd = [
        sys.executable,
        "-m",
        "pip",
        "install",
        "--quiet",
        "--target",
        PACKAGE_DIR,
        "strands-agents",
        "strands-agents-tools",
        "boto3",
    ]
    subprocess.check_call(cmd)

    print("Creating govfixer-lambda.zip...")
    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        # Add dependency files
        for root, dirs, files in os.walk(PACKAGE_DIR):
            # Skip dist-info and __pycache__
            dirs[:] = [d for d in dirs if not d.endswith(".dist-info") and d != "__pycache__"]
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, PACKAGE_DIR)
                zf.write(full_path, rel_path)

        # Add project Python files
        for py_file in PY_FILES:
            full_path = os.path.join(SCRIPT_DIR, py_file)
            if os.path.exists(full_path):
                zf.write(full_path, py_file)
            else:
                print(f"WARNING: File {py_file} not found!")

    size_mb = os.path.getsize(ZIP_PATH) / (1024 * 1024)
    print(f"Done! Created {ZIP_PATH} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    build_package()
