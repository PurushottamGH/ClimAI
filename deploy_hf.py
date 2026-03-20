import sys
try:
    from huggingface_hub import HfApi
except ImportError:
    import subprocess
    print("Installing huggingface_hub...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "huggingface_hub"])
    from huggingface_hub import HfApi

def deploy():
    print("========================================")
    print("🚀 CLIMAI HUGGING FACE DEPLOYER 🚀")
    print("========================================")
    
    token = input("\nPaste your Hugging Face Token (starting with hf_): ").strip()
    
    if not token.startswith("hf_"):
        print("❌ Error: Invalid token format.")
        return

    print("\n⏳ Uploading backend folder to Hugging Face...")
    try:
        api = HfApi(token=token)
        # Uploads the contents of 'backend/' to the root of the Hugging Face Space
        api.upload_folder(
            folder_path="backend",
            repo_id="iPurushottam/ClimAI",
            repo_type="space",
            ignore_patterns=["__pycache__/*", "*.pyc", ".env"]
        )
        print("\n✅ DEPLOYMENT SUCCESSFUL!")
        print("Your backend files have been pushed to Hugging Face and the Space is rebuilding.")
        print("View it here: https://huggingface.co/spaces/iPurushottam/ClimAI")
    except Exception as e:
        print(f"\n❌ DEPLOYMENT FAILED: {e}")

if __name__ == "__main__":
    deploy()
