from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db
from app.models.models import User, ChatMessage, EmotionLog
from app.models.schemas import ChatInput, ProfileUpdate, EmotionLogCreate
from app.utils.auth import get_current_user
from app.services.emotion_service import generate_response

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("/send")
async def send_message(
    data: ChatInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Fetch recent history for context
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(desc(ChatMessage.created_at))
        .limit(10)
    )
    history_msgs = history_result.scalars().all()
    history = [
        {"content": m.content, "is_ai_response": m.is_ai_response}
        for m in reversed(history_msgs)
    ]

    ai_result = generate_response(data.message, history)

    # Save user message
    user_msg = ChatMessage(
        user_id=current_user.id,
        content=data.message,
        is_ai_response=False,
        emotion_detected=ai_result["emotion"],
        sentiment_score=ai_result["sentiment_score"],
    )
    db.add(user_msg)

    # Save AI response
    ai_msg = ChatMessage(
        user_id=current_user.id,
        content=ai_result["response"],
        is_ai_response=True,
        emotion_detected=ai_result["emotion"],
        sentiment_score=ai_result["sentiment_score"],
    )
    db.add(ai_msg)

    # Log emotion
    emotion_log = EmotionLog(
        user_id=current_user.id,
        emotion=ai_result["emotion"],
        intensity=ai_result["confidence"],
        note=data.message[:200],
    )
    db.add(emotion_log)

    # Update user mood
    current_user.current_mood = ai_result["emotion"]

    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(ai_msg)

    return {
        "user_message": {
            "id": user_msg.id,
            "content": user_msg.content,
            "created_at": str(user_msg.created_at),
        },
        "ai_response": {
            "id": ai_msg.id,
            "content": ai_msg.content,
            "emotion": ai_result["emotion"],
            "confidence": ai_result["confidence"],
            "sentiment_score": ai_result["sentiment_score"],
            "coping_tip": ai_result["coping_tip"],
            "created_at": str(ai_msg.created_at),
        },
    }


@router.get("/history")
async def get_chat_history(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve chat history for the current user."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(desc(ChatMessage.created_at))
        .offset(offset)
        .limit(limit)
    )
    messages = result.scalars().all()
    return [
        {
            "id": m.id,
            "content": m.content,
            "is_ai_response": m.is_ai_response,
            "emotion_detected": m.emotion_detected,
            "sentiment_score": m.sentiment_score,
            "created_at": str(m.created_at),
        }
        for m in reversed(messages)
    ]
