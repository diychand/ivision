from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Todo

router = APIRouter()

@router.get("/todos")
def get_todos(db: Session = Depends(get_db)):
    return db.query(Todo).all()

@router.post("/todos")
def create_todo(title: str, db: Session = Depends(get_db)):
    todo = Todo(title=title)
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo

@router.put("/todos/{todo_id}")
def complete_todo(todo_id: int, db: Session = Depends(get_db)):
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    todo.completed = True
    db.commit()
    return todo

@router.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    db.delete(todo)
    db.commit()
    return {"message": "deleted"}