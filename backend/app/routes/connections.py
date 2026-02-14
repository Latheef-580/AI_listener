from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc
from app.database import get_db
from app.models.models import User, UserConnection, DirectMessage
from app.models.schemas import ConnectionRequest, DirectMessageCreate
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/connect", tags=["Connections"])


@router.get("/discover")
async def discover_users(
    mood: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Find users to connect with, optionally filtered by mood."""
    query = select(User).where(User.id != current_user.id)
    if mood:
        query = query.where(User.current_mood == mood)
    query = query.limit(20)
    result = await db.execute(query)
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "avatar_url": u.avatar_url,
            "current_mood": u.current_mood,
            "bio": u.bio,
            "is_online": u.is_online,
        }
        for u in users
    ]


@router.post("/request")
async def send_connection_request(
    data: ConnectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.target_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot connect with yourself")

    # Check target user exists
    result = await db.execute(select(User).where(User.id == data.target_user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Check existing connection
    result = await db.execute(
        select(UserConnection).where(
            or_(
                and_(UserConnection.user_id == current_user.id, UserConnection.connected_user_id == data.target_user_id),
                and_(UserConnection.user_id == data.target_user_id, UserConnection.connected_user_id == current_user.id),
            )
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Connection already exists")

    matched_on = current_user.current_mood if current_user.current_mood == target.current_mood else "interest"
    conn = UserConnection(
        user_id=current_user.id,
        connected_user_id=data.target_user_id,
        matched_on=matched_on,
    )
    db.add(conn)
    await db.commit()
    return {"message": "Connection request sent", "id": conn.id}


@router.put("/accept/{connection_id}")
async def accept_connection(
    connection_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserConnection).where(
            UserConnection.id == connection_id,
            UserConnection.connected_user_id == current_user.id,
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection request not found")
    conn.status = "accepted"
    await db.commit()
    return {"message": "Connection accepted"}


@router.get("/my-connections")
async def get_connections(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserConnection).where(
            or_(
                UserConnection.user_id == current_user.id,
                UserConnection.connected_user_id == current_user.id,
            ),
            UserConnection.status == "accepted",
        )
    )
    connections = result.scalars().all()
    connected_ids = []
    for c in connections:
        other_id = c.connected_user_id if c.user_id == current_user.id else c.user_id
        connected_ids.append(other_id)

    if not connected_ids:
        return []

    result = await db.execute(select(User).where(User.id.in_(connected_ids)))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "avatar_url": u.avatar_url,
            "current_mood": u.current_mood,
            "is_online": u.is_online,
        }
        for u in users
    ]


@router.get("/pending")
async def get_pending_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserConnection).where(
            UserConnection.connected_user_id == current_user.id,
            UserConnection.status == "pending",
        )
    )
    pending = result.scalars().all()
    sender_ids = [p.user_id for p in pending]
    if not sender_ids:
        return []

    result = await db.execute(select(User).where(User.id.in_(sender_ids)))
    users = {u.id: u for u in result.scalars().all()}
    return [
        {
            "connection_id": p.id,
            "user": {
                "id": users[p.user_id].id,
                "username": users[p.user_id].username,
                "display_name": users[p.user_id].display_name,
                "current_mood": users[p.user_id].current_mood,
            },
            "matched_on": p.matched_on,
            "created_at": str(p.created_at),
        }
        for p in pending if p.user_id in users
    ]


# --- Direct Messages ---
@router.post("/messages")
async def send_direct_message(
    data: DirectMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = DirectMessage(
        sender_id=current_user.id,
        receiver_id=data.receiver_id,
        content=data.content,
        message_type=data.message_type,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "content": msg.content,
        "message_type": msg.message_type,
        "created_at": str(msg.created_at),
    }


@router.get("/messages/{user_id}")
async def get_direct_messages(
    user_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DirectMessage)
        .where(
            or_(
                and_(DirectMessage.sender_id == current_user.id, DirectMessage.receiver_id == user_id),
                and_(DirectMessage.sender_id == user_id, DirectMessage.receiver_id == current_user.id),
            )
        )
        .order_by(desc(DirectMessage.created_at))
        .limit(limit)
    )
    messages = result.scalars().all()
    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "receiver_id": m.receiver_id,
            "content": m.content,
            "message_type": m.message_type,
            "is_read": m.is_read,
            "created_at": str(m.created_at),
        }
        for m in reversed(messages)
    ]


@router.delete("/messages/{user_id}")
async def clear_chat_history(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        select(DirectMessage)
        .where(
            or_(
                and_(DirectMessage.sender_id == current_user.id, DirectMessage.receiver_id == user_id),
                and_(DirectMessage.sender_id == user_id, DirectMessage.receiver_id == current_user.id),
            )
        )
    )
    # Actually delete
    # Note: verify delete syntax for SQLAlchemy 2.0 async
    from sqlalchemy import delete
    await db.execute(
        delete(DirectMessage).where(
            or_(
                and_(DirectMessage.sender_id == current_user.id, DirectMessage.receiver_id == user_id),
                and_(DirectMessage.sender_id == user_id, DirectMessage.receiver_id == current_user.id),
            )
        )
    )
    await db.commit()
    return {"message": "Chat history cleared"}
