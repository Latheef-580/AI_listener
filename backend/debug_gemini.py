import os
import asyncio
import logging
from app.services.emotion_service import generate_response_with_gemini, model
from dotenv import load_dotenv

# Configure logging to print to console
logging.basicConfig(level=logging.DEBUG)

load_dotenv()

print(f"API Key present: {bool(os.getenv('GEMINI_API_KEY'))}")
print(f"Model initialized: {model is not None}")

def test():
    print("Testing Gemini generation with configured model...")
    try:
        # Re-import to get updated model
        from app.services.emotion_service import generate_response_with_gemini
        
        response = generate_response_with_gemini("I am bored", [])
        if response:
            print("Success!")
            print(f"Response: {response['response']}")
            print(f"Emotion: {response['emotion']}")
        else:
            print("Returned None (Check error_log.txt)")
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

if __name__ == "__main__":
    test()
