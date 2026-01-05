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
    totalTasks: number;
    completedTasks: number;
    taskListNames: string[];
    timeline: { date: string; done: boolean }[];
    phases: TaskGroup[];
    lists: TaskGroup[];
}

// 新增：目标任务统计接口
export interface GoalTaskStats {
    total_tasks: number;
    completed_tasks: number;
}

// ==========================================
// 辅助函数
// ==========================================
const getHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${localStorage.getItem("access_token") || ""}`
});

const calculateStats = (groups: TaskGroup[]) => {
    let total = 0, completed = 0;
    groups.forEach(g => g.tasks.forEach(t => {
        total++;
        if (t.done) completed++;
    }));

    return {
        total,
        completed,
        progress: total === 0 ? 0 : Math.round((completed / total) * 100)
    };
};

// ==========================================
// 核心适配器 (Adapter)
// ==========================================
const enrichGoalData = async (apiGoal: ApiGoal): Promise<GoalUI> => {
    try {
        // 1. 并行发起所有请求
        const [phasesRes, listIdsRes, allListsRes, statsRes] = await Promise.all([
            // A. 获取阶段
            axios.get<ApiResponse<ApiPhase[]>>(`${API_BASE}/api/v1/phases`, {
                params: { goal_id: apiGoal.id },
                headers: getHeaders()
            }),
            // B. 获取关联的 List ID
            axios.get<ApiResponse<string[]>>(`${API_BASE}/api/v1/goals/${apiGoal.id}/task-lists`, {
                headers: getHeaders()
            }),
            // C. 获取所有 Lists (为了匹配名字)
            axios.get<ApiResponse<any[]>>(`${API_BASE}/api/v1/task-lists`, {
                headers: getHeaders()
            }),
            // D. 【关键】获取统计数据 (使用你新增的接口)
            axios.get<ApiResponse<{ total_tasks: number; completed_tasks: number }>>(
                `${API_BASE}/api/v1/goals/${apiGoal.id}/task-stats`,
                { headers: getHeaders() }
            )
        ]);

        // 2. 解构数据
        const apiPhases = phasesRes.data?.data || [];
        const linkedListIds = listIdsRes.data?.data || [];
        const allLists = allListsRes.data?.data || [];
        // 获取统计数字，默认为 0
        const statsData = statsRes.data?.data || { total_tasks: 0, completed_tasks: 0 };

        // 3. 匹配清单名字
        const associatedListNames = allLists
            .filter((list: any) => linkedListIds.includes(list.id))
            .map((list: any) => list.name);

        // useless legacy code
        const phasesUI: TaskGroup[] = [];

        // 5. 计算进度百分比
        // 注意：分母为 0 时进度为 0
        const progressPercent = statsData.total_tasks === 0
            ? 0
            : Math.round((statsData.completed_tasks / statsData.total_tasks) * 100);

        return {
            id: apiGoal.id,
            title: apiGoal.name,
            description: apiGoal.description || "",

            // 使用后端返回的统计数据
            progress: progressPercent,
            totalTasks: statsData.total_tasks,
            completedTasks: statsData.completed_tasks,

            taskListNames: associatedListNames,
            timeline: [
                { date: new Date(apiGoal.created_at).toLocaleDateString().slice(0, 5), done: true },
                { date: "Today", done: false }
            ],
            phases: phasesUI,
            lists: []
        };
    } catch (error) {
        console.error(`Critical failure in enriching goal ${apiGoal.id}:`, error);
        return {
            id: apiGoal.id,
            title: apiGoal.name,
            description: "",
            progress: 0,
            totalTasks: 0,
            completedTasks: 0,
            taskListNames: [],
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

    async updateGoal(id: string, name: string, description: string): Promise<boolean> {
        try {
            const res = await axios.put(`${API_BASE}/api/v1/goals/${id}`,
                { name, description },
                { headers: getHeaders() }
            );
            // 文档显示成功返回 code: 0
            return res.data?.code === 0;
        } catch (e) {
            console.error("Update Goal Failed", e);
            return false;
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

    // 获取目标下的任务统计（总数和已完成数）
    async getGoalTaskStats(goalId: string): Promise<GoalTaskStats | null> {
        try {
            const res = await axios.get<ApiResponse<GoalTaskStats>>(
                `${API_BASE}/api/v1/goals/${goalId}/task-stats`,
                { headers: getHeaders() }
            );
            return res.data.code === 0 ? res.data.data : null;
        } catch (e) {
            console.error("Get Goal Task Stats Failed", e);
            return null;
        }
    },

    // 获取目标下的 Task List ID 列表
    async getGoalTaskListIds(goalId: string): Promise<string[]> {
        try {
            const res = await axios.get<ApiResponse<string[]>>(
                `${API_BASE}/api/v1/goals/${goalId}/task-lists`,
                { headers: getHeaders() }
            );
            // 确保返回的是数组，如果出错或 code!=0 则返回空数组
            return res.data.code === 0 && Array.isArray(res.data.data) ? res.data.data : [];
        } catch (e) {
            console.error("Get Goal Task List IDs Failed", e);
            return [];
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
    async createPhase(goalId: string, name: string): Promise<boolean> {
        try {
            const res = await axios.post(`${API_BASE}/api/v1/phases`,
                { goal_id: goalId, name },
                { headers: getHeaders() }
            );
            // 文档 201 响应 Schema 中 code 仍为 0
            return res.data?.code === 0;
        } catch (e) {
            console.error("Create Phase Failed", e);
            return false;
        }
    },

    async updatePhase(phaseId: string, name: string): Promise<boolean> {
        try {
            const res = await axios.put(`${API_BASE}/api/v1/phases/${phaseId}`,
                { name },
                { headers: getHeaders() }
            );
            return res.data?.code === 0;
        } catch (e) {
            console.error("Update Phase Failed", e);
            return false;
        }
    },

    async deletePhase(phaseId: string): Promise<boolean> {
        try {
            const res = await axios.delete(`${API_BASE}/api/v1/phases/${phaseId}`, {
                headers: getHeaders()
            });
            return res.data?.code === 0;
        } catch (e) {
            console.error("Delete Phase Failed", e);
            return false;
        }
    },

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
    },

    async deletePhaseTask(taskId: string): Promise<boolean> {
        try {
            // 注意：此处路径必须是 /api/v1/phases/tasks/ 开头
            const res = await axios.delete(`${API_BASE}/api/v1/phases/tasks/${taskId}`, {
                headers: getHeaders()
            });
            return res.data?.code === 0;
        } catch (e) {
            console.error("Delete Task Failed", e);
            return false;
        }
    },
};