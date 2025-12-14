import type { Route } from "./+types/dashboard";
import "./dashboard.scss"
import React, { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import DashboardGoalItem from '../../components/dashboardGoalItem';
import { TaskItem } from '../../components/taskItem';
import { GoalService, type GoalUI } from '../../api/goals';
import {
    getLists,
    getTasks as fetchTasksApi,
    updateTask as updateTaskApi,
    deleteTask as deleteTaskApi,
    type Task
} from '../../api/tasks';

export function meta({}: Route.MetaArgs) {
    return [
        { title: "AuroraMind Dashboard" },
        { name: "description", content: "Your Goals and Tasks" },
    ];
}

export default function Dashboard() {
    // ==========================================
    // 1. 状态管理
    // ==========================================
    const [goals, setGoals] = useState<GoalUI[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ==========================================
    // 2. 数据获取 (useEffect)
    // ==========================================
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                // 1. 获取 Goals
                const goalsPromise = GoalService.getAllGoals();

                // 2. 获取 Tasks (逻辑稍微复杂，因为 API 限制需要 ListID)
                // 策略：获取所有列表 -> 并行获取每个列表的任务 -> 展平数组
                const tasksPromise = (async () => {
                    try {
                        const lists = await getLists();
                        if (!lists || lists.length === 0) return [];

                        // 并行请求所有列表的任务
                        const allTasksResponses = await Promise.all(
                            lists.map(list => fetchTasksApi(list.id))
                        );
                        // 展平二维数组 [[task1], [task2, task3]] => [task1, task2, task3]
                        return allTasksResponses.flat();
                    } catch (e) {
                        console.error("Error fetching tasks:", e);
                        return [];
                    }
                })();

                const [fetchedGoals, fetchedTasks] = await Promise.all([
                    goalsPromise,
                    tasksPromise
                ]);

                setGoals(fetchedGoals);
                setTasks(fetchedTasks);

            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // ==========================================
    // 3. 交互逻辑 Handlers
    // ==========================================

    // 筛选今天的任务
    const todaysTasks = useMemo(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        return tasks.filter(task => {
            // 处理可能的 null/undefined 情况
            const taskDate = task.end_date ? task.end_date.split('T')[0] : '';
            // 显示今天且未完成的任务
            return taskDate === todayStr && !task.is_completed;
        });
    }, [tasks]);

    // 切换完成状态
    const handleToggleTask = async (taskId: string) => {
        // 找到当前任务
        const targetTask = tasks.find(t => t.id === taskId);
        if (!targetTask) return;

        // 乐观更新 UI (先变色，再请求)
        const updatedStatus = !targetTask.is_completed;
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, is_completed: updatedStatus } : t
        ));

        // 构建 API 需要的对象
        const apiPayload: Task = {
            ...targetTask,
            is_completed: updatedStatus
        };

        const result = await updateTaskApi(apiPayload);

        // 如果失败，回滚状态
        if (!result) {
            console.error("Failed to toggle task");
            setTasks(prev => prev.map(t =>
                t.id === taskId ? targetTask : t
            ));
        }
    };

    // 更新任务
    const handleUpdateTask = async (originalTask: Task, newName: string, newDate: string) => {
        // 乐观更新 UI
        setTasks(prev => prev.map(t =>
            t.id === originalTask.id ? { ...t, name: newName, end_date: newDate } : t
        ));

        // 构建 API 需要的对象
        const apiPayload: Task = {
            ...originalTask,
            name: newName,
            end_date: newDate
        };

        const result = await updateTaskApi(apiPayload);

        if (!result) {
            // 失败回滚
            setTasks(prev => prev.map(t => t.id === originalTask.id ? originalTask : t));
        }
    };

    // 删除任务
    const handleDeleteTask = async (id: string) => {
        // 乐观更新 UI
        const previousTasks = [...tasks];
        setTasks(prev => prev.filter(t => t.id !== id));

        const success = await deleteTaskApi(id);

        if (!success) {
            // 失败回滚
            setTasks(previousTasks);
        }
    };

    // ==========================================
    // 4. Render
    // ==========================================

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-blue-500 font-medium animate-pulse">Loading AuroraMind...</div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8 h-16">
                {/* Header Placeholder */}
            </div>

            <div className="max-w-[1600px] mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                    {/* Goals Section */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-semibold text-gray-800">Goals</h2>
                        </div>
                        <div className="px-4">
                            {goals.length > 0 ? (
                                goals.map(goal => (
                                    <DashboardGoalItem key={goal.id} data={goal} />
                                ))
                            ) : (
                                <p className="text-center text-gray-400 py-10">No active goals.</p>
                            )}
                        </div>
                    </div>

                    {/* Tasks Section */}
                    <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm flex flex-col h-full">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-800">Today</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {todaysTasks.length > 0 ? (
                                <ul className="space-y-3">
                                    {todaysTasks.map(task => (
                                        <TaskItem
                                            key={task.id}
                                            task={task}
                                            // 这里的 prop 名字是 onToggle, onUpdate, onDelete
                                            // 传入的函数是 handleToggleTask, handleUpdateTask, handleDeleteTask
                                            onToggle={() => handleToggleTask(task.id)}
                                            onUpdate={handleUpdateTask}
                                            onDelete={handleDeleteTask}
                                        />
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
                                    <span>🎉 No tasks for today</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Summary Section */}
                <div className="w-full bg-white rounded-2xl p-8 shadow-sm min-h-[300px] flex items-center justify-center">
                    <div className="text-center">
                        <h3 className="text-lg font-medium text-gray-800 mb-2">Summary</h3>
                        <p className="text-gray-400 text-sm">Your weekly summary will appear here.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}