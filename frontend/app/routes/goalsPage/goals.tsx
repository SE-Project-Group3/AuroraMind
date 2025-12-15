// app/routes/goals.tsx
import type { Route } from "./+types/goals";
import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import GoalItem from '../../components/goalItem';
import BreakdownModal from '../../components/breakdownModal';
import GoalEditModal from '../../components/goalEditModal'; // [1] 引入新组件
import { GoalService } from '../../api/goals';
import { useNavigate } from "react-router";
import type {GoalUI} from '../../api/goals';

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Goals - AuroraMind" },
        { name: "description", content: "Goals" },
    ];
}

// loader
export async function loader({}: Route.LoaderArgs) {
    return null;
}

export default function goalsPage() {
    const [goals, setGoals] = useState<GoalUI[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<GoalUI | null>(null);
    const navigate = useNavigate();

    // --- 初始化数据 ---
    const loadData = async () => {
        try {
            setLoading(true);
            const data = await GoalService.getAllGoals(); // 直接调用 Service
            setGoals(data);
        } catch (e) {
            console.error("Failed to load goals", e);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = async () => {
        const data = await GoalService.getAllGoals();
        setGoals(data);
        // 如果当前正在编辑，也要更新编辑弹窗里的数据引用，防止数据不同步
        if (editingGoal) {
            const updatedCurrent = data.find(g => g.id === editingGoal.id);
            if (updatedCurrent) setEditingGoal(updatedCurrent);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // --- 事件处理 ---
    const handleCreateGoal = async () => {
        const name = prompt("Enter goal name:");
        if (!name) return;

        const newGoal = await GoalService.createGoal(name, "New Goal Description");
        await loadData();
        // TODO: update logic optimization
        // if (newGoal) {
        //     // setGoals(prev => [...prev, newGoal]);
        //     console.log("new goal created.")
        //     await loadData();
        // }
    };

    const handleEditGoal = (goal: GoalUI) => {
        setEditingGoal(goal);
    };

    const handleDeleteGoal = async (id: string) => {
        if (!confirm("Are you sure?")) return;

        const success = await GoalService.deleteGoal(id);
        // TODO: update logic optimization
        await loadData();
        // if (success) {
        //     // setGoals(prev => prev.filter(g => g.id !== id));
        //     console.log("goal deleted.")
        //     await loadData();
        // }
    };

    // --- 渲染 ---
    return (
        <div className="flex-1 bg-gray-50 min-h-screen p-8">
            <div className="flex justify-between items-center mb-8 h-16"></div>
            <div className="max-w-6xl mx-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-10 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    goals.map((goal) => (
                        <div key={goal.id} className="relative group">
                            {/* 删除按钮 */}
                            <button
                                onClick={() => handleDeleteGoal(goal.id)}
                                className="absolute top-6 right-6 z-10 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={18} />
                            </button>

                            <GoalItem
                                data={goal}
                                onOpenBreakdown={() => setIsModalOpen(true)}
                                onOpenResource={() => {
                                    navigate('/app/knowledge');
                                }}
                                onEdit={() => handleEditGoal(goal)}
                            />
                        </div>
                    ))
                )}

                <div className="text-center mt-10">
                    <button
                        onClick={handleCreateGoal}
                        className="text-blue-500 hover:text-blue-600 font-medium transition-colors"
                    >
                        + Create a new goal
                    </button>
                </div>
            </div>
            <BreakdownModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            {/* [4] 渲染新的编辑弹窗 */}
            <GoalEditModal
                isOpen={!!editingGoal}
                goal={editingGoal}
                onClose={() => setEditingGoal(null)}
                onGoalUpdated={refreshData} // 数据变动时，静默刷新
            />
        </div>
    );
}