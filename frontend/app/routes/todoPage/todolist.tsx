import "./todolist.scss";

export function TodoView() {

  const todosDefault = [
    { taskName: "Review and summarize the Raft consensus algorithm paper", taskDate: "Today" },
    { taskName: "Implement a simple TCP server and client in Go", taskDate: "Tomorrow" },
  ];

  const todosCompleted = [
    { taskName: "Write notes on CAP theorem and real-world examples", taskDate: "Nov 10", checked: true }
  ];

  const todoLists = ["Default List", "List A", "List B"]

  return (
    <div className="todo-view">
      <div className="list-column">
        <h2>{todoLists[0]}</h2>

        <TodoList title="To do" todos={todosDefault} />
        <TodoList title="Completed" todos={todosCompleted} />

        <button className="add-task">+ Add a new task</button>
      </div>

      <div className="list-column empty">
        <h2>{todoLists[1]}</h2>
        <button className="add-task">+ Add a new task</button>
      </div>

      <div className="list-column empty">
        <h2>{todoLists[2]}</h2>
        <button className="add-task">+ Add a new task</button>
      </div>
    </div>
  );
}

export type TodoListProps = {
  title: string;
  todos: TodoItemProps[];
  onToggle?: (index: number) => void;
};

export function TodoList({ title, todos, onToggle }: TodoListProps) {
  return (
    <div className="list-column">
      <h2 className="section-title">{title}</h2>

      <ul className="task-list">
        {todos.map((todo, index) => (
          <TodoItem
            key={index}
            {...todo}
            onToggle={() => onToggle?.(index)}
          />
        ))}
      </ul>
    </div>
  );
}

export type TodoItemProps = {
  taskName: string;
  taskDate: string;
  checked?: boolean;
  onToggle?: () => void;
};

export function TodoItem({ taskName, taskDate, checked, onToggle }: TodoItemProps) {
  return (
    <li className={checked ? "completed-task" : "todo-task"}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span className="task-description"> {taskName} </span>
      <span className="task-date">{taskDate}</span>
    </li>
  );
}