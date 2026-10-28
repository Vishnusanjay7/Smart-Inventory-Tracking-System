from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.category import Category
from app.models.user import UserRole
from app.schemas.category import CategoryCreate, CategoryResponse
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Category).all()

@router.post("", response_model=CategoryResponse)
def create_category(
    cat_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles([UserRole.ADMIN, UserRole.MANAGER]))
):
    existing = db.query(Category).filter(Category.name == cat_in.name.strip()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category already exists")
    cat = Category(name=cat_in.name.strip(), description=cat_in.description)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat
