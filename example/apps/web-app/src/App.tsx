import { useState, useEffect } from 'react'

interface Task {
  id: number
  title: string
  description: string
  completed: boolean
  userId: number
}

interface User {
  id: number
  name: string
  email: string
  role: string
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState({ title: '', description: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [tasksRes, usersRes] = await Promise.all([
        fetch('http://localhost:8080/tasks'),
        fetch('http://localhost:5000/users'),
      ])
      setTasks(await tasksRes.json())
      setUsers(await usersRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.title) return

    try {
      const res = await fetch('http://localhost:8080/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          completed: false,
          userId: 1,
        }),
      })
      const task = await res.json()
      setTasks([...tasks, task])
      setNewTask({ title: '', description: '' })
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const toggleTask = async (task: Task) => {
    try {
      await fetch(`http://localhost:8080/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, completed: !task.completed }),
      })
      setTasks(tasks.map(t => 
        t.id === task.id ? { ...t, completed: !t.completed } : t
      ))
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const deleteTask = async (id: number) => {
    try {
      await fetch(`http://localhost:8080/tasks/${id}`, { method: 'DELETE' })
      setTasks(tasks.filter(t => t.id !== id))
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const getUserName = (userId: number) => 
    users.find(u => u.id === userId)?.name || 'Unknown'

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="app">
      <header>
        <h1>📋 Task Manager</h1>
        <p className="subtitle">Bazel Monorepo Demo: Go + React + .NET</p>
      </header>

      <main>
        <section className="add-task">
          <h2>Add New Task</h2>
          <form onSubmit={addTask}>
            <input
              type="text"
              placeholder="Task title..."
              value={newTask.title}
              onChange={e => setNewTask({ ...newTask, title: e.target.value })}
            />
            <input
              type="text"
              placeholder="Description..."
              value={newTask.description}
              onChange={e => setNewTask({ ...newTask, description: e.target.value })}
            />
            <button type="submit">Add Task</button>
          </form>
        </section>

        <section className="tasks">
          <h2>Tasks ({tasks.length})</h2>
          <div className="task-list">
            {tasks.map(task => (
              <div key={task.id} className={`task-card ${task.completed ? 'completed' : ''}`}>
                <div className="task-header">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task)}
                  />
                  <h3>{task.title}</h3>
                  <button className="delete-btn" onClick={() => deleteTask(task.id)}>
                    ✕
                  </button>
                </div>
                <p>{task.description}</p>
                <span className="assignee">👤 {getUserName(task.userId)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="users">
          <h2>Team Members ({users.length})</h2>
          <div className="user-list">
            {users.map(user => (
              <div key={user.id} className="user-card">
                <div className="avatar">{user.name.charAt(0)}</div>
                <div className="user-info">
                  <strong>{user.name}</strong>
                  <span>{user.role}</span>
                  <span className="email">{user.email}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <p>
          <span className="service go">Go API :8080</span>
          <span className="service react">React :5173</span>
          <span className="service dotnet">.NET API :5000</span>
        </p>
      </footer>
    </div>
  )
}
