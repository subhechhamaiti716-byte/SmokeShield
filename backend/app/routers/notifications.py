from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.deps import get_current_user
from app.models import User, Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationOut(BaseModel):
    notification_id: str
    title: str
    body: str
    type: str
    read: bool
    data: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UnreadCountOut(BaseModel):
    unread_count: int


@router.get("", response_model=List[NotificationOut])
def list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all notifications for the current user, newest first."""
    notifs = (
        db.query(Notification)
        .filter_by(user_id=current_user.user_id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        NotificationOut(
            notification_id=str(n.notification_id),
            title=n.title,
            body=n.body,
            type=n.type,
            read=n.read,
            data=n.data,
            created_at=n.created_at,
        )
        for n in notifs
    ]


@router.get("/unread-count", response_model=UnreadCountOut)
def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    count = db.query(Notification).filter_by(user_id=current_user.user_id, read=False).count()
    return UnreadCountOut(unread_count=count)


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = (
        db.query(Notification)
        .filter_by(notification_id=notification_id, user_id=current_user.user_id)
        .first()
    )
    if notif:
        notif.read = True
        db.commit()
    return {"status": "ok"}


@router.post("/mark-all-read")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter_by(user_id=current_user.user_id, read=False).update({"read": True})
    db.commit()
    return {"status": "ok", "message": "All notifications marked as read"}
