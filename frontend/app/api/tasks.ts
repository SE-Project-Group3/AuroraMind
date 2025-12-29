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
    created_at?: string;
    updated_at?: string;
}

export interface TaskCreation {
    "name": string;
    "is_completed": boolean;
    "task_list_id": string;
    "start_date": string;
    "end_date": string;
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
    if (res.status === 200) {
        // 关键步骤：映射数据
        return res.data.data.map((item: any) => ({
            ...item,
            goalId: item.goal_id, // 把后端的 goal_id 赋值给前端的 goalId
            // 如果后端将来加了 goal_name，这里也可以映射: goalName: item.goal_name
        }));
    }
    return res.data.data;
}

export async function createList(name: string, goal_id = null) {
    const token = localStorage.getItem("access_token");
    const res = await axios.post(`${API_BASE}/api/v1/task-lists`,
        {
            "name": name,
            "goal_id": goal_id,
        },
        {
            headers: {
                "Content-Type": "application/json",
                 Authorization: token ? `Bearer ${token}` : ""
            },
        });
    if (res.status === 201) {
        return res.data.data;
    }
    console.log("failed to create task list")
    return null;
}

export async function updateList(listId: string, name: string, goal_id: string | null = null) {
    const token = localStorage.getItem("access_token");
    const res = await axios.put(`${API_BASE}/api/v1/task-lists/${listId}`,
        {
            "name": name,
            "goal_id": goal_id
        },
        {
            headers: {
                "Content-Type": "application/json",
                 Authorization: token ? `Bearer ${token}` : ""
            },
        });
    if (res.status === 200) {
        return res.data.data;
    }
    console.log("failed to update list status")
    return null;
}

export async function deleteList(listId: string) {
    const token = localStorage.getItem("access_token");
    const res = await axios.delete(`${API_BASE}/api/v1/task-lists/${listId}`,
        {
            headers: {
                "Content-Type": "application/json",
                 Authorization: token ? `Bearer ${token}` : ""
            },
        });
    if (res.status === 200) {
        return res.data.data;
    }
    console.log("failed to delete list")
    return null;
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

export async function updateTask(task: Task) {
    const token = localStorage.getItem("access_token");
    const res = await axios.put(`${API_BASE}/api/v1/tasks/${task.id}`,
        {
            "name": task.name,
            "is_completed": task.is_completed,
            "task_list_id": task.task_list_id,
            "start_date": task.start_date,
            "end_date": task.end_date,
        },
        {
            headers: {
                "Content-Type": "application/json",
                 Authorization: token ? `Bearer ${token}` : ""
            },
        });
    if (res.status === 200) {
        return res.data.data;
    }
    console.log("failed to update task status")
    return null;
}

export async function createTask(task: TaskCreation) {
    const token = localStorage.getItem("access_token");
    const res = await axios.post(`${API_BASE}/api/v1/tasks`,
        {
            "name": task.name,
            "is_completed": task.is_completed,
            "task_list_id": task.task_list_id,
            "start_date": task.start_date,
            "end_date": task.end_date,
        },
        {
            headers: {
                "Content-Type": "application/json",
                 Authorization: token ? `Bearer ${token}` : ""
            },
        });
    if (res.status === 201) {
        return res.data.data;
    }
    console.log("failed to create task")
    return null;
}

export async function deleteTask(taskId: string): Promise<boolean> {
    const token = localStorage.getItem("access_token");
    const res = await axios.delete(`${API_BASE}/api/v1/tasks/${taskId}`,
        {
            headers: {
                "Content-Type": "application/json",
                 Authorization: token ? `Bearer ${token}` : ""
            },
        });
    return res.data.data === true;
}