import { useState, useEffect } from "react"

function App() {
  const [todos, setTodos] = useState([])
  const [title, setTitle] = useState("")

  useEffect(() => {
    fetch("http://127.0.0.1:8000/todos")
      .then(res => res.json())
      .then(data => setTodos(data))
  }, [])

  const addTodo = () => {
    fetch(`http://127.0.0.1:8000/todos?title=${title}`, {
      method: "POST"
    })
      .then(res => res.json())
      .then(todo => {
        setTodos([...todos, todo])
        setTitle("")
      })
  }

  const completeTodo = (id) => {
    fetch(`http://127.0.0.1:8000/todos/${id}`, {
      method: "PUT"
    })
      .then(res => res.json())
      .then(updated => {
        setTodos(todos.map(t => t.id === id ? updated : t))
      })
  }

  return (
    <div style={{ padding: "40px", fontFamily: "Arial", maxWidth: "500px" }}>
      <h1>iVision Todo</h1>
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Add a task..."
          style={{ flex: 1, padding: "8px" }}
        />
        <button onClick={addTodo} style={{ padding: "8px 16px" }}>Add</button>
      </div>
      {todos.map(todo => (
        <div key={todo.id} style={{ 
          padding: "10px", 
          marginBottom: "8px", 
          border: "1px solid #ddd",
          borderRadius: "4px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span style={{ textDecoration: todo.completed ? "line-through" : "none" }}>
            {todo.title}
          </span>
          {!todo.completed && (
            <button onClick={() => completeTodo(todo.id)}>Done</button>
          )}
        </div>
      ))}
    </div>
  )
}

export default App