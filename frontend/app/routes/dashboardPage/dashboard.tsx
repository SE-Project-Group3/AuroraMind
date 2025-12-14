import type { Route } from "./+types/dashboard";
import "./dashboard.scss"
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import DashboardGoalItem from '../../components/dashboardGoalItem'; // 刚刚新建的组件
import { TaskItem } from '../../components/taskItem'; // 你原本的组件
import type { GoalUI } from '../../api/goals';
import type { Task } from '../../api/tasks';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

// export default function Dashboard() {
//   return <div>
//     <div className="layout">
//     </div>
//       <h1>I'm home</h1>
//     </div>;
// }

// 模拟数据接口，实际项目中请替换为你的 API 数据
interface DashboardProps {
    goals: GoalUI[];
    tasks: Task[];
    // 传递给 TaskItem 的处理函数
    onToggleTask: (id: string) => void;
    onUpdateTask: (task: Task, newName: string, newDate: string) => void;
    onDeleteTask: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
                                                 goals = [],
                                                 tasks = [],
                                                 onToggleTask,
                                                 onUpdateTask,
                                                 onDeleteTask
                                             }) => {

    // 1. 筛选今天的任务
    const todaysTasks = useMemo(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        return tasks.filter(task => {
            // 假设 end_date 格式为 ISO 字符串或 'YYYY-MM-DD'
            const taskDate = task.end_date ? task.end_date.split('T')[0] : '';
            return taskDate === todayStr && !task.is_completed; // 也可以选择显示已完成的
        });
    }, [tasks]);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8 h-16"></div>
            <div className="max-w-[1600px] mx-auto">

                {/* 顶部区域：两列布局 (左 Goals, 右 Tasks) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                    {/* --- Goals Section (占据 2/3 宽度) --- */}
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

                    {/* --- Tasks Section (占据 1/3 宽度) --- */}
                    <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm flex flex-col h-full">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-800">Today</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {todaysTasks.length > 0 ? (
                                <ul className="space-y-3">
                                    {todaysTasks.map(task => (
                                        // 复用你现有的 TaskItem
                                        <TaskItem
                                            key={task.id}
                                            task={task}
                                            onToggle={() => onToggleTask(task.id)}
                                            onUpdate={onUpdateTask}
                                            onDelete={onDeleteTask}
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

                {/* --- Summary Section (底部全宽) --- */}
                <div className="w-full bg-white rounded-2xl p-8 shadow-sm min-h-[300px] flex items-center justify-center">
                    {/* 这是一个占位符，你可以放入图表或文本编辑器 */}
                    <div className="text-center">
                        <h3 className="text-lg font-medium text-gray-800 mb-2">Summary</h3>
                        <p className="text-gray-400 text-sm">Your weekly summary will appear here.</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;