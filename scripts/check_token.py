import sys
try:
    from huggingface_hub import whoami
    from huggingface_hub.utils import HfHubHTTPError
except ImportError:
    print("❌ huggingface_hub is not installed. Run 'pip install huggingface_hub'")
    sys.exit(1)

def check_token():
    print("=" * 50)
    print("🔥 HUGGING FACE TOKEN DOCTOR 🔥")
    print("=" * 50)
    token = input("\nPaste your new Hugging Face token here (starts with hf_): ").strip()
    
    if not token.startswith("hf_"):
        print("\n❌ Error: That doesn't look like a valid token. It must start with 'hf_'")
        return

    print("\n⏳ Testing token against Hugging Face API...")
    try:
        user_info = whoami(token)
        print("\n✅ Token is VALID!")
        print(f"👤 Account: {user_info.get('name')}")
        
        # Check permissions
        can_write = False
        orgs = user_info.get('orgs', [])
        
        if 'write' in user_info.get('auth', {}).get('accessToken', {}).get('role', ''):
            can_write = True
        elif user_info.get('auth', {}).get('accessToken', {}).get('fineGrained', False):
            # It's a fine-grained token
            scopes = user_info.get('auth', {}).get('accessToken', {}).get('scoped', [])
            for scope in scopes:
                if 'write' in scope.get('permissions', []) and 'iPurushottam/ClimAI' in scope.get('entity', {}).get('name', ''):
                    can_write = True
                    break
        else:
            can_write = True # legacy write token
            
        # Simplest write check:
        # Just tell them to look at the role object
        token_role = user_info.get('auth', {}).get('accessToken', {}).get('role', 'unknown')
        is_fine_grained = user_info.get('auth', {}).get('accessToken', {}).get('fineGrained', False)
        
        print(f"🔑 Token Type: {'Fine-Grained' if is_fine_grained else 'Legacy'}")
        print(f"📝 Global Role: {token_role}")
        
        if token_role == 'read' and not is_fine_grained:
            print("\n🚨 CRITICAL ERROR: This is a READ-ONLY token.")
            print("👉 You must go back to HF and create a new token with the WRITE role.")
        else:
            print("\n✅ This token looks good. If GitHub Actions still fails with a 401:")
            print("   1. You probably added it to 'Repository variables' instead of 'Repository secrets'.")
            print("   2. You misspelled the secret name. It MUST be EXACTLY: HF_TOKEN")
            print("   3. Go to github.com/PurushottamGH/ClimAI/settings/secrets/actions and check.")
            
    except HfHubHTTPError as e:
        if e.response.status_code == 401:
            print("\n❌ Error 401: The token is completely INVALID or REVOKED.")
            print("👉 This token will not work anywhere. You must generate a new one.")
        else:
            print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    check_token()
