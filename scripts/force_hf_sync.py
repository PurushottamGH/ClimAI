import os
import sys
from huggingface_hub import HfApi

# --- CONFIGURATION ---
REPO_ID = "ipurushottam/climai"
REPO_TYPE = "space"
# ---------------------

def sync_to_hf():
    print("🚀 Starting manual Hugging Face sync...")
    
    token = input("Please enter your Hugging Face Write Token: ").strip()
    if not token:
        print("❌ Error: Token is required.")
        return

    api = HfApi(token=token)
    
    try:
        print(f"📡 Uploading folder to {REPO_ID}...")
        api.upload_folder(
            folder_path="../backend",
            repo_id=REPO_ID,
            repo_type=REPO_TYPE,
            ignore_patterns=[".git/*", "node_modules/*", "__pycache__/*", ".venv/*", "*.pyc"]
        )
        print("✅ SUCCESS! Your Hugging Face Space is now fully synchronized.")
    except Exception as e:
        print(f"❌ Error during upload: {e}")

if __name__ == "__main__":
    sync_to_hf()
