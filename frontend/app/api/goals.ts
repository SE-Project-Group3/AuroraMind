import axios from 'axios';

const API_BASE = "http://127.0.0.1:8080";

// 辅助函数
const getHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
    };
};

// ==========================================
// 类型定义
// ==========================================
export interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

export interface ApiGoal {
    id: string;
    name: string;
    description: string;
    user_id: string;
    created_at: string;
    updated_at: string;
}

export interface ApiPhase {
    id: string;
    goal_id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface ApiTaskList {
    id: string;
    goal_id: string;
    name: string;
    user_id: string;
    created_at: string;
    updated_at: string;
}

export interface TimelinePoint {
    date: string;
    done: boolean;
}

export interface UiTask {
    id: string;
    text: string;
    done: boolean;
}

export interface TaskGroup {
    id: string;
    title: string;
    tasks: UiTask[];
}

export interface GoalUI {
    id: string;
    title: string;
    description: string;
    progress: number;
    timeline: TimelinePoint[];
    phases: TaskGroup[];
    lists: TaskGroup[];
}

interface CreatePhasePayload {
    goal_id: string;
    name: string;
}

interface CreateTaskPayload {
    phase_id: string;
    name: string;
    is_completed: boolean;
}

// ==========================================
// 辅助逻辑
// ==========================================
const calculateProgress = (groups: TaskGroup[]): number => {
    let total = 0;
    let completed = 0;
    groups.forEach(g => {
        g.tasks.forEach(t => {
            total++;
            if (t.done) completed++;
        });
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
};

const fetchTasksForGroup = async (parentId: string): Promise<UiTask[]> => {
    // 暂时返回空任务，防止这里报错干扰调试
    return [];
};

// ==========================================
// 核心适配器 (Adapter) - 带日志
// ==========================================
const enrichGoalData = async (apiGoal: ApiGoal): Promise<GoalUI> => {
    // 🟢 调试日志：检查进入适配器的原始数据
    console.log(`Processing Goal: ${apiGoal.name} (ID: ${apiGoal.id})`);

    try {
        const [phasesRes] = await Promise.all([
            axios.get<ApiResponse<ApiPhase[]>>(`${API_BASE}/api/v1/phases`, {
                params: { goal_id: apiGoal.id },
                headers: getHeaders()
            }),
        ]);

        // 🟢 调试日志：检查 Phases 请求结果
        // console.log("Phases Response:", phasesRes.data);

        const apiPhases = phasesRes.data?.data || [];
        const apiTaskLists: ApiTaskList[] = [];

        const phasesUI: TaskGroup[] = await Promise.all(apiPhases.map(async (p) => {
            const tasks = await fetchTasksForGroup(p.id);
            return { id: p.id, title: p.name, tasks };
        }));

        const listsUI: TaskGroup[] = await Promise.all(apiTaskLists.map(async (l) => {
            const tasks = await fetchTasksForGroup(l.id);
            return { id: l.id, title: l.name, tasks };
        }));

        const progress = calculateProgress([...phasesUI, ...listsUI]);

        const timeline: TimelinePoint[] = [
            { date: new Date(apiGoal.created_at).toLocaleDateString().slice(0, 5), done: true },
            { date: "Today", done: false }
        ];

        return {
            id: apiGoal.id,
            title: apiGoal.name,
            description: apiGoal.description || "No description",
            progress,
            timeline,
            phases: phasesUI,
            lists: listsUI
        };

    } catch (error) {
        console.error(`❌ Enrich Failed for Goal ID: ${apiGoal.id}`, error);
        // 返回基础数据，保证 UI 能显示出来
        return {
            id: apiGoal.id,
            title: apiGoal.name,
            description: apiGoal.description || "Description placeholder",
            progress: 0,
            timeline: [],
            phases: [],
            lists: []
        };
    }
};

// ==========================================
// API Service - 带日志
// ==========================================
export const GoalService = {
    // GET All Goals
    async getAllGoals(): Promise<GoalUI[]> {
        try {
            console.log("🚀 开始请求: GET /api/v1/goals");
            const res = await axios.get<ApiResponse<ApiGoal[]>>(`${API_BASE}/api/v1/goals`, {
                headers: getHeaders()
            });

            // 🔥 关键调试点：打印后端返回的真实结构
            console.log("🔥 后端返回的完整 res:", res);
            console.log("📦 后端返回的数据体 (res.data):", res.data);

            // 检查解包逻辑
            const responseData = res.data;

            // 1. 检查 code 是否为 0
            if (responseData.code !== 0) {
                console.warn(`⚠️ Warning: API Code is ${responseData.code}, expected 0`);
            }

            // 2. 检查 data 是否为数组
            if (!Array.isArray(responseData.data)) {
                console.error("❌ Error: res.data.data 不是一个数组!", responseData.data);
                return [];
            }

            console.log(`✅ 成功获取到 ${responseData.data.length} 个 goals，开始转换格式...`);

            const result = await Promise.all(responseData.data.map(enrichGoalData));
            console.log("🎉 最终转换后的 UI 数据:", result);
            return result;

        } catch (e) {
            console.error("❌ Get All Goals Request Failed:", e);
            return [];
        }
    },

    // POST Create Goal
    async createGoal(name: string, description: string = ""): Promise<GoalUI | null> {
        try {
            console.log("🚀 开始创建 Goal:", name);
            const res = await axios.post<ApiResponse<ApiGoal>>(
                `${API_BASE}/api/v1/goals`,
                { name, description },
                { headers: getHeaders() }
            );

            console.log("📦 创建返回的数据:", res.data);

            if (res.data && res.data.code === 0) {
                return enrichGoalData(res.data.data);
            }
            return null;
        } catch (e) {
            console.error("❌ Create Goal Failed", e);
            return null;
        }
    },

    // PUT Update Goal
    async updateGoal(id: string, name: string, description: string): Promise<GoalUI | null> {
        try {
            console.log(`Updating Goal: ${id}`);
            const res = await axios.put<ApiResponse<ApiGoal>>(
                `${API_BASE}/api/v1/goals/${id}`,
                { name, description },
                { headers: getHeaders() }
            );

            // 如果更新成功 (code === 0)，我们需要返回新的 GoalUI 数据以更新界面
            if (res.data && res.data.code === 0) {
                console.log("Goal Update Success");
                // 使用适配器将后端返回的 ApiGoal 转为前端的 GoalUI
                return enrichGoalData(res.data.data);
            }
            return null;
        } catch (e) {
            console.error("Update Goal Failed", e);
            return null;
        }
    },

    // DELETE Goal
    async deleteGoal(id: string): Promise<boolean> {
        try {
            console.log(`Deleting Goal: ${id}`);
            const res = await axios.delete<ApiResponse<boolean>>(
                `${API_BASE}/api/v1/goals/${id}`,
                { headers: getHeaders() }
            );

            // code === 0 就算成功
            const success = res.data && res.data.code === 0;
            if (success) {
                console.log("Goal Delete Success");
            }
            return success;
        } catch (e) {
            console.error("Delete Goal Failed", e);
            return false;
        }
    },

    // ==========================================
    // 新增：Phase 相关接口
    // ==========================================

    // 创建 Phase
    async createPhase(goalId: string, name: string): Promise<boolean> {
        try {
            const res = await axios.post<ApiResponse<any>>(`${API_BASE}/api/v1/phases`,
                { goal_id: goalId, name },
                { headers: getHeaders() }
            );
            return res.data?.code === 0;
        } catch (e) {
            console.error("Create Phase Failed", e);
            return false;
        }
    },

    // 更新 Phase (重命名)
    async updatePhase(phaseId: string, name: string): Promise<boolean> {
        try {
            const res = await axios.put<ApiResponse<any>>(`${API_BASE}/api/v1/phases/${phaseId}`,
                { name },
                { headers: getHeaders() }
            );
            return res.data?.code === 0;
        } catch (e) {
            console.error("Update Phase Failed", e);
            return false;
        }
    },

    // 删除 Phase
    async deletePhase(phaseId: string): Promise<boolean> {
        try {
            const res = await axios.delete<ApiResponse<any>>(`${API_BASE}/api/v1/phases/${phaseId}`, {
                headers: getHeaders()
            });
            return res.data?.code === 0;
        } catch (e) {
            console.error("Delete Phase Failed", e);
            return false;
        }
    },

    // ==========================================
    // Phase Task 相关接口
    // ==========================================

    // 创建 Task
    async createPhaseTask(phaseId: string, name: string): Promise<boolean> {
        try {
            // 注意：API文档显示 URL 里有 phase_id，Body 里也有 phase_id，为了保险我们都带上
            const res = await axios.post<ApiResponse<any>>(`${API_BASE}/api/v1/phases/${phaseId}/tasks`,
                { phase_id: phaseId, name, is_completed: false },
                { headers: getHeaders() }
            );
            return res.data?.code === 0;
        } catch (e) {
            console.error("Create Task Failed", e);
            return false;
        }
    },

    // 更新 Task (重命名 或 勾选完成)
    async updatePhaseTask(taskId: string, name: string, isCompleted: boolean): Promise<boolean> {
        try {
            const res = await axios.put<ApiResponse<any>>(`${API_BASE}/api/v1/phases/tasks/${taskId}`,
                { name, is_completed: isCompleted },
                { headers: getHeaders() }
            );
            return res.data?.code === 0;
        } catch (e) {
            console.error("Update Task Failed", e);
            return false;
        }
    },

    // 删除 Task
    async deletePhaseTask(taskId: string): Promise<boolean> {
        try {
            const res = await axios.delete<ApiResponse<any>>(`${API_BASE}/api/v1/phases/tasks/${taskId}`, {
                headers: getHeaders()
            });
            return res.data?.code === 0;
        } catch (e) {
            console.error("Delete Task Failed", e);
            return false;
        }
    }
};
