import axios from 'axios';

const API_BASE = "http://127.0.0.1:8080";

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
    created_at: string;
}

export interface ApiPhase {
    id: string;
    goal_id: string;
    name: string;
}

// AI 拆解相关类型
export interface BreakdownItem {
    order: number;
    text: string;
}

export interface SelectableBreakdownItem extends BreakdownItem {
    checked: boolean; // 用于前端 UI 状态记录
}

export interface BreakdownResponse {
    goal_id: string;
    items: BreakdownItem[];
}

export interface SelectionRequest {
    task_list_id?: string;
    task_list_name?: string;
    items: BreakdownItem[];
}

// UI 展示相关类型
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
    timeline: { date: string; done: boolean }[];
    phases: TaskGroup[];
    lists: TaskGroup[];
}

// ==========================================
// 辅助函数
// ==========================================
const getHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${localStorage.getItem("access_token") || ""}`
});

const calculateProgress = (groups: TaskGroup[]): number => {
    let total = 0, completed = 0;
    groups.forEach(g => g.tasks.forEach(t => {
        total++;
        if (t.done) completed++;
    }));
    return total === 0 ? 0 : Math.round((completed / total) * 100);
};

// ==========================================
// 核心适配器 (Adapter)
// ==========================================
const enrichGoalData = async (apiGoal: ApiGoal): Promise<GoalUI> => {
    try {
        // 1. 获取 Phases 列表
        const res = await axios.get<ApiResponse<ApiPhase[]>>(`${API_BASE}/api/v1/phases`, {
            params: { goal_id: apiGoal.id },
            headers: getHeaders()
        });

        const apiPhases = res.data?.data || [];

        // 2. 获取任务时增加个体异常捕获
        const phasesUI: TaskGroup[] = await Promise.all(apiPhases.map(async (p) => {
            try {
                // 尝试获取任务，如果 405 或 500，则返回空数组
                const taskRes = await axios.get<ApiResponse<any[]>>(`${API_BASE}/api/v1/phases/${p.id}/tasks`, {
                    headers: getHeaders()
                });

                const tasks = (taskRes.data?.data || []).map(t => ({
                    id: t.id,
                    text: t.name,
                    done: t.is_completed
                }));

                return { id: p.id, title: p.name, tasks };
            } catch (taskError) {
                // 针对 405 错误静默处理，保证 Phase 标题能渲染
                console.warn(`Task fetch failed for phase ${p.id}, returning empty list.`, taskError);
                return { id: p.id, title: p.name, tasks: [] };
            }
        }));

        return {
            id: apiGoal.id,
            title: apiGoal.name,
            description: apiGoal.description || "",
            progress: calculateProgress(phasesUI),
            timeline: [
                { date: new Date(apiGoal.created_at).toLocaleDateString().slice(0, 5), done: true },
                { date: "Today", done: false }
            ],
            phases: phasesUI,
            lists: []
        };
    } catch (error) {
        console.error(`Critical failure in enriching goal ${apiGoal.id}:`, error);
        // 最终兜底：至少返回目标名称
        return {
            id: apiGoal.id,
            title: apiGoal.name,
            description: "",
            progress: 0,
            timeline: [],
            phases: [],
            lists: []
        };
    }
};

// ==========================================
// API Service
// ==========================================
export const GoalService = {
    // 获取所有目标
    async getAllGoals(): Promise<GoalUI[]> {
        try {
            const res = await axios.get(`${API_BASE}/api/v1/goals`, { headers: getHeaders() });

            // 调试：看看原始的 res.data 到底长什么样
            console.log("Raw Response Data:", res.data);

            // 如果后端结构是 { code: 0, data: [...] }
            const rawList = res.data?.data;

            if (!Array.isArray(rawList)) {
                console.error("Data is not an array!", rawList);
                return [];
            }

            // 进行转换
            return await Promise.all(rawList.map(enrichGoalData));
        } catch (e) {
            console.error("Get All Goals Failed", e);
            return [];
        }
    },

    // 创建目标
    async createGoal(name: string, description: string = ""): Promise<GoalUI | null> {
        try {
            const res = await axios.post<ApiResponse<ApiGoal>>(`${API_BASE}/api/v1/goals`, { name, description }, { headers: getHeaders() });
            return res.data.code === 0 ? enrichGoalData(res.data.data) : null;
        } catch (e) {
            console.error("Create Goal Failed", e);
            return null;
        }
    },

    // 删除目标
    async deleteGoal(id: string): Promise<boolean> {
        try {
            const res = await axios.delete<ApiResponse<any>>(`${API_BASE}/api/v1/goals/${id}`, { headers: getHeaders() });
            return res.data.code === 0;
        } catch (e) {
            return false;
        }
    },

    // ==========================================
    // AI Breakdown 新增逻辑
    // ==========================================

    /**
     * 调用 AI 对目标进行拆解
     */
    async breakdownGoal(goalId: string, text: string, model: string = "gpt-3.5-turbo"): Promise<BreakdownItem[]> {
        try {
            const res = await axios.post(`${API_BASE}/api/v1/goals/${goalId}/breakdown`,
                { text, model, extra: {} },
                { headers: getHeaders() }
            );

            // 🔍 关键调试：看看后端返回的原始 JSON
            console.log("AI Breakdown Raw Response:", res.data);

            // 如果后端返回 code 是 200 而不是 0，这里需要调整判断条件
            if (res.data.code === 0 || res.data.code === 200) {
                const items = res.data.data.items || [];
                console.log("Extracted Items:", items);
                return items;
            }

            console.warn("API returned success code but logic code is not 0/200", res.data.code);
            return [];
        } catch (e) {
            console.error("AI Breakdown Request Failed", e);
            return [];
        }
    },

    /**
     * 将选中的拆解项保存为任务列表
     */
    async submitBreakdownSelection(goalId: string, payload: SelectionRequest): Promise<boolean> {
        try {
            const res = await axios.post<ApiResponse<any>>(
                `${API_BASE}/api/v1/goals/${goalId}/breakdown/selection`,
                payload,
                { headers: getHeaders() }
            );
            return res.data.code === 0;
        } catch (e) {
            console.error("Submit Selection Failed", e);
            return false;
        }
    },

    // ==========================================
    // Phase & Task 基础操作
    // ==========================================
    async createPhaseTask(phaseId: string, name: string): Promise<boolean> {
        try {
            const res = await axios.post(`${API_BASE}/api/v1/phases/${phaseId}/tasks`,
                { phase_id: phaseId, name, is_completed: false },
                { headers: getHeaders() }
            );
            return res.data?.code === 0;
        } catch (e) { return false; }
    },

    async updatePhaseTask(taskId: string, name: string, isCompleted: boolean): Promise<boolean> {
        try {
            const res = await axios.put(`${API_BASE}/api/v1/phases/tasks/${taskId}`,
                { name, is_completed: isCompleted },
                { headers: getHeaders() }
            );
            return res.data?.code === 0;
        } catch (e) { return false; }
    }
};