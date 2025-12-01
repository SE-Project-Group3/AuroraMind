import "./todolist.scss";
import { getLists, getTasks } from "../../api/tasks"
import { useState, useEffect } from 'react';
import type { Route } from "./+types/todolist";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "To-Do - AuroraMind" },
        { name: "description", content: "To-Do List" },
    ];
}

export const handle = {
    clientLoader: true,
};

// loader
export async function loader({}: Route.LoaderArgs) {
    return null;
}

export async function clientLoader({}: Route.LoaderArgs) {
    return null;
}

export default function TodoView() {

    const [lists, setLists] = useState<any[] | null>(null);
    const [tasks, setTasks] = useState<any[] | null>(null);

    useEffect(() => {
        async function fetchData() {
            const listsResp = await getLists();
            const tasksResp = [];
            for (const item of listsResp) {
                const response = await getTasks(item.id);
                tasksResp.push(response);
            };
            setLists(listsResp);
            setTasks(tasksResp.flat());
            console.log(listsResp);
            console.log(tasksResp.flat());
        }
        fetchData();
    }, []);

    return (
        <div className="todo-view">
            {lists && tasks && lists.map((list, index) => {
                let taskItems = tasks.filter((item) => {item.task_list_id === list.id})

                console.log(taskItems);
                const uncompleted = taskItems.filter(t => !t.is_completed);
                const completed = taskItems.filter(t => t.is_completed);

                return (
                    <div className="list-column" key={list.id}>
                        <h2>{list.name}</h2>

                        <TodoList title="To do" todos={uncompleted} />
                        <TodoList title="Completed" todos={completed} />

                        <button className="add-task">+ Add a new task</button>
                    </div>
                );
        })}
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
            <button className="add-task">+ Add a new task</button>
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