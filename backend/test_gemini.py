import os
import asyncio
from app.services.emotion_service import generate_response
from dotenv import load_dotenv

load_dotenv()

print(f"API Key present: {bool(os.getenv('GEMINI_API_KEY'))}")

async def test():
    print("Testing 'I am bored'...")
    response = generate_response("I am bored")
    print(f"Response: {response['response']}")
    print(f"Is Crisis: {response['is_crisis']}")
    print(f"Emotion: {response['emotion']}")
    
    print("\nTesting 'Lets play a game'...")
    response = generate_response("lets play a game")
    print(f"Response: {response['response']}")

if __name__ == "__main__":
    asyncio.run(test())
