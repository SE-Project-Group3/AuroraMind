import "./todolist.scss";
import { getLists, getTasks, updateTask, type Task } from "../../api/tasks"
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

export async function clientLoader({}: Route.LoaderArgs) {
    const lists = await getLists();
    const tasks = [];
    for (const item of lists) {
        tasks.push(await getTasks(item.id));
    }
    return {lists: lists, tasks: tasks};
}
clientLoader.hydrate = true;

export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function TodoView({loaderData}: Route.ComponentProps) {
    const [lists, setLists] = useState(loaderData.lists);
    const [tasks, setTasks] = useState(loaderData.tasks.flat());
    console.log(tasks);

    const handleTaskToggle = async (task: Task) => {
        const newStatus = !task.is_completed;
        const taskToUpdate = { ...task, is_completed: newStatus };

        const updatedTaskFromApi = await updateTask(taskToUpdate);
        if (updatedTaskFromApi) {
            setTasks((prevTasks) =>
                prevTasks.map((t) =>
                    t.id === updatedTaskFromApi.id ? updatedTaskFromApi : t
                )
            );
        } else {
            console.log("Failed to update task");
        }
    };

    return (
        <div className="todo-view">
            {lists && tasks && lists.map((list, index) => {
                let taskItems = tasks.filter((item) => item.task_list_id === list.id)

                console.log(taskItems);
                const uncompleted = taskItems.filter(t => !t.is_completed);
                const completed = taskItems.filter(t => t.is_completed);

                return (
                    <div className="list-column" key={list.id}>
                        <h2>{list.name}</h2>

                        <TodoList title="To do" tasks={uncompleted} onToggleTask={handleTaskToggle}/>
                        <TodoList title="Completed" tasks={completed} onToggleTask={handleTaskToggle}/>
                        {index === 0 && <button className="add-task">+ Add a new list</button>}
                    </div>
                );
        })}
        </div>
    );
}

export type TodoListProps = {
    title: string;
    tasks: Task[];
    onToggleTask: (task: Task) => void;
};

export function TodoList({ title, tasks, onToggleTask }: TodoListProps) {
    return (
    <div className="list-column">
        <h2 className="section-title">{title}</h2>

        <ul className="task-list">
            {tasks.map((task, index) => (
                <TodoItem
                    key={index}
                    task={task}
                    onToggle={() => onToggleTask(task)}
                />
            ))}
        </ul>
        {title === "To do" && <button className="add-task">+ Add a new task</button>}
    </div>
    );
}

export type TodoItemProps = {
    task: Task;
    onToggle: () => void;
}

export function TodoItem({ task, onToggle }: TodoItemProps) {
    const formattedDate = task.end_date ? task.end_date.split('T')[0] : "";
    return (
        <li className={task.is_completed ? "completed-task" : "todo-task"}>
            <input type="checkbox" checked={task.is_completed} onChange={onToggle} />
            <span className="task-description"> {task.name} </span>
            <span className="task-date">{formattedDate}</span>
        </li>
    );
}