import axios from "axios";
const API_BASE = "http://127.0.0.1:8080";

export interface TaskList{
    name: string;
    id: string;
    user_id: string;
    created_at: string;
    updated_at: string;
}

export interface Task{
    name: string;
    is_completed: boolean;
    id: string;
    user_id: string;
    task_list_id: string;
    start_date: string;
    end_date: string;
    created_at: string;
    updated_at: string;
}

export async function getLists(): Promise<TaskList[]> {
    const token = localStorage.getItem("access_token");
    const res = await axios.get(`${API_BASE}/api/v1/task-lists`,
        {
            headers: {
                "Content-Type": "application/json",
                 Authorization: token ? `Bearer ${token}` : ""
            },
        });
    return res.data.data;
}

export async function getTasks(listId: string): Promise<Task[]> {
    const token = localStorage.getItem("access_token");
    const res = await axios.get(`${API_BASE}/api/v1/tasks?task_list_id=${listId}`,
        {
            headers: {
                "Content-Type": "application/json",
                 Authorization: token ? `Bearer ${token}` : ""
            },
        });
    return res.data.data;
}