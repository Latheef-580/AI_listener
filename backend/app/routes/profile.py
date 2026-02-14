from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.database import get_db
from app.models.models import User, EmotionLog
from app.models.schemas import ProfileUpdate, EmotionLogCreate
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.get("/me")
async def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "display_name": current_user.display_name,
        "avatar_url": current_user.avatar_url,
        "bio": current_user.bio,
        "voice_preference": current_user.voice_preference,
        "theme_preference": current_user.theme_preference,
        "current_mood": current_user.current_mood,
        "created_at": str(current_user.created_at),
    }


@router.put("/me")
async def update_profile(
    data: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    await db.commit()
    await db.refresh(current_user)
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "display_name": current_user.display_name,
        "avatar_url": current_user.avatar_url,
        "bio": current_user.bio,
        "voice_preference": current_user.voice_preference,
        "theme_preference": current_user.theme_preference,
        "current_mood": current_user.current_mood,
    }


@router.get("/emotions")
async def get_emotion_logs(
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return recent emotion logs for mood tracking graph."""
    result = await db.execute(
        select(EmotionLog)
        .where(EmotionLog.user_id == current_user.id)
        .order_by(desc(EmotionLog.created_at))
        .limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "emotion": l.emotion,
            "intensity": l.intensity,
            "note": l.note,
            "created_at": str(l.created_at),
        }
        for l in reversed(logs)
    ]


@router.post("/emotions")
async def log_emotion(
    data: EmotionLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = EmotionLog(
        user_id=current_user.id,
        emotion=data.emotion,
        intensity=data.intensity,
        note=data.note,
    )
    db.add(log)
    current_user.current_mood = data.emotion
    await db.commit()
    await db.refresh(log)
    return {"id": log.id, "emotion": log.emotion, "intensity": log.intensity, "created_at": str(log.created_at)}


@router.get("/emotions/summary")
async def emotion_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return emotion frequency counts for chart display."""
    result = await db.execute(
        select(EmotionLog.emotion, func.count(EmotionLog.id).label("count"))
        .where(EmotionLog.user_id == current_user.id)
        .group_by(EmotionLog.emotion)
    )
    rows = result.all()
    return {row[0]: row[1] for row in rows}


@router.get("/{user_id}")
async def get_public_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None  # Or raise 404
    
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "current_mood": user.current_mood,
        "is_online": user.is_online,
        "created_at": str(user.created_at),
    }


@router.get("/{user_id}/emotions/summary")
async def public_emotion_summary(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return emotion frequency counts for another user."""
    result = await db.execute(
        select(EmotionLog.emotion, func.count(EmotionLog.id).label("count"))
        .where(EmotionLog.user_id == user_id)
        .group_by(EmotionLog.emotion)
    )
    rows = result.all()
    return {row[0]: row[1] for row in rows}
