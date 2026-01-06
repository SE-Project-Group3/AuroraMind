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
import { SummaryService, type SummaryItem } from "../../api/summary";

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
    const [latestSummary, setLatestSummary] = useState<SummaryItem | null>(null);
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

                // 并行请求：Goals, Tasks, 和 Weekly Summary
                const [fetchedGoals, fetchedTasks, fetchedSummaries] = await Promise.all([
                    GoalService.getAllGoals(),
                    (async () => {
                        const lists = await getLists();
                        if (!lists || lists.length === 0) return [];
                        const allTasks = await Promise.all(lists.map(l => fetchTasksApi(l.id)));
                        return allTasks.flat();
                    })(),
                    SummaryService.getWeekly() // 获取周报列表
                ]);

                setGoals(fetchedGoals);
                setTasks(fetchedTasks);

                // 取最新的一条周报
                if (fetchedSummaries && fetchedSummaries.length > 0) {
                    setLatestSummary(fetchedSummaries[0]);
                }
            } catch (error) {
                console.error("Dashboard load error:", error);
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
        <div className="p-6 bg-gray-50 h-[calc(100vh-10vh)] mt-[10vh] transition-[margin] duration-300 ease-in-out ml-[15%] [.nav-collapsed_&]:ml-[5%] flex flex-col">
            {/* <div className="flex justify-between items-center mb-8 h-16"> */}
                {/* Header Placeholder */}
            {/* </div> */}

            <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col gap-6 min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                    {/* Goals Section */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm flex flex-col overflow-hidden h-full">
                        <div className="text-center mb-6 flex-shrink-0">
                            <h2 className="text-xl font-semibold text-gray-800">Goals</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
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
                    <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm flex flex-col overflow-hidden h-full">
                        <div className="text-center mb-6 flex-shrink-0">
                            <h2 className="text-xl font-semibold text-gray-800">Today</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {todaysTasks.length > 0 ? (
                                <ul className="space-y-3 [&_li:not(.editing)]:flex [&_li:not(.editing)]:items-center [&_li:not(.editing)]:gap-3">
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
                <div className="w-full bg-white rounded-2xl p-8 shadow-sm h-64 shrink-0 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <h3 className="text-lg font-semibold text-gray-800">Weekly Summary</h3>
                        {latestSummary && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold uppercase tracking-wider">
                {latestSummary.summary_type}
            </span>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {latestSummary ? (
                            <div className="flex flex-col h-full justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                                        {latestSummary.content}
                                    </p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
                                    <span>Week of {format(new Date(latestSummary.period_start), 'MMM dd, yyyy')}</span>
                                    <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                        {latestSummary.status}
                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <p className="text-gray-400 text-sm mb-3">No summary generated for this week.</p>
                                <button
                                    onClick={() => window.location.href = '/summary'}
                                    className="text-indigo-600 text-xs font-semibold hover:text-indigo-700 transition-colors"
                                >
                                    + Generate AI Summary
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}