import React, { useState } from 'react';
import { X, Loader2, Circle, List, CheckSquare, Square } from 'lucide-react';
import { GoalService, type BreakdownItem } from '../api/goals';

// 定义带勾选状态的项目类型
interface SelectableItem extends BreakdownItem {
    checked: boolean;
}

interface BreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    goalId: string;
    onSuccess?: () => void;
}

const BreakdownModal: React.FC<BreakdownModalProps> = ({ isOpen, onClose, goalId, onSuccess }) => {
    const [inputText, setInputText] = useState('');
    const [items, setItems] = useState<SelectableItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    // 逻辑：拆解目标并默认全部勾选
    const handleBreakdown = async () => {
        if (!inputText.trim()) return;
        setLoading(true);

        try {
            const rawItems = await GoalService.breakdownGoal(goalId, inputText);

            console.log("Items received in Modal:", rawItems);

            if (rawItems && rawItems.length > 0) {
                // 🌟 必须确保这里设置了状态，才会触发重新渲染显示右侧
                const selectable = rawItems.map(item => ({
                    ...item,
                    checked: true // 默认全部勾选
                }));
                setItems(selectable);
            } else {
                alert("AI returned empty results. Check backend prompt/logs.");
            }
        } catch (err) {
            console.error("Modal breakdown error:", err);
        } finally {
            setLoading(false);
        }
    };

    // 逻辑：切换勾选状态
    const toggleCheck = (index: number) => {
        const newItems = [...items];
        newItems[index].checked = !newItems[index].checked;
        setItems(newItems);
    };

    // 逻辑：仅保存勾选的任务
    const handleApply = async () => {
        const selectedItems = items.filter(i => i.checked);
        if (selectedItems.length === 0) {
            alert("Please select at least one task.");
            return;
        }

        setSaving(true);
        try {
            const success = await GoalService.submitBreakdownSelection(goalId, {
                task_list_name: "AI Action Plan",
                items: selectedItems.map(({ order, text }) => ({ order, text })) // 还原为后端要求的格式
            });
            if (success) {
                onSuccess?.();
                onClose();
            }
        } finally {
            setSaving(false);
        }
    };

    // 将任务平分为两组（模拟原型图中的 List-A 和 List-B）
    const half = Math.ceil(items.length / 2);
    const groupA = items.slice(0, half);
    const groupB = items.slice(half);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
            <div className={`bg-white rounded-3xl shadow-2xl transition-all duration-500 flex overflow-hidden ${items.length > 0 ? 'max-w-5xl w-full' : 'max-w-2xl w-full'}`}>

                {/* --- 左侧面板：输入与引导 --- */}
                <div className={`p-10 flex-1 transition-all ${items.length > 0 ? 'border-r border-gray-100 bg-gray-50/30' : ''}`}>
                    <div className="relative h-full flex flex-col">
                        <div className="text-center space-y-2 mb-10">
                            <h2 className="text-3xl font-bold text-gray-900">AI–Powered Goal Breakdown</h2>
                            <p className="text-gray-400">Stop feeling overwhelmed - start taking action</p>
                        </div>

                        <div className="space-y-4 flex-1">
                            <label className="block text-gray-800 font-semibold text-lg text-center">What do you want to work on?</label>
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                className="w-full h-48 p-6 border-2 border-gray-100 rounded-2xl bg-white resize-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all text-gray-700 text-lg shadow-inner"
                                placeholder="Describe your goal..."
                            />
                        </div>

                        <div className="flex justify-center mt-8">
                            <button
                                onClick={handleBreakdown}
                                disabled={loading || !inputText}
                                className="px-16 py-3 bg-white border-2 border-blue-400 text-blue-500 rounded-full hover:bg-blue-500 hover:text-white disabled:opacity-30 transition-all shadow-lg font-bold text-lg"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Break it Down'}
                            </button>
                        </div>

                        {items.length === 0 && (
                            <div className="mt-10 space-y-6 text-gray-500">
                                <ol className="list-decimal space-y-3 pl-6 text-sm">
                                    <li>Start with your workspace - open the tools you'll use.</li>
                                    <li>State your goal simply - one sentence is enough.</li>
                                    <li>Break it into main pieces - list the core sections.</li>
                                </ol>
                                <p className="text-blue-400 text-center font-medium">One step is enough to move forward.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- 右侧面板：结果展示（仅在有 items 时显示） --- */}
                {items.length > 0 && (
                    <div className="w-1/2 p-10 bg-white flex flex-col animate-in slide-in-from-right duration-500">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Action Steps Generated</h2>
                                <p className="text-sm text-gray-400">AI has structured a plan for you.</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-4 space-y-8 custom-scrollbar">
                            {/* Main Goal Section */}
                            <section className="space-y-3">
                                <h4 className="flex items-center gap-2 text-blue-500 font-bold uppercase tracking-wider text-xs">
                                    <Circle size={14} fill="currentColor" /> Main Goal
                                </h4>
                                <p className="text-gray-600 bg-blue-50/50 p-4 rounded-xl border border-blue-100 leading-relaxed italic">
                                    "{inputText}"
                                </p>
                            </section>

                            {/* Group A */}
                            <TaskGroup title="Task Lists-A" items={groupA} onToggle={(idx) => toggleCheck(idx)} offset={0} />

                            {/* Group B */}
                            <TaskGroup title="Task Lists-B" items={groupB} onToggle={(idx) => toggleCheck(idx + half)} offset={half} />
                        </div>

                        <button
                            onClick={handleApply}
                            disabled={saving}
                            className="mt-8 w-full py-4 bg-white border-2 border-blue-100 text-blue-500 rounded-2xl font-bold hover:bg-blue-500 hover:text-white transition-all shadow-xl flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="animate-spin" /> : 'Apply Selection'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// 内部辅助组件：任务组
const TaskGroup = ({ title, items, onToggle, offset }: { title: string, items: SelectableItem[], onToggle: (i: number) => void, offset: number }) => (
    <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider text-xs">
            <List size={14} /> {title}
        </h4>
        <div className="space-y-2">
            {items.map((item, idx) => (
                <div
                    key={idx}
                    onClick={() => onToggle(idx)}
                    className="group flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-blue-100 hover:bg-blue-50/30 transition-all cursor-pointer"
                >
                    <span className={`text-sm transition-all ${item.checked ? 'text-gray-700' : 'text-gray-300 line-through'}`}>
                        {item.text}
                    </span>
                    {item.checked ? (
                        <CheckSquare size={18} className="text-blue-500" />
                    ) : (
                        <Square size={18} className="text-gray-300" />
                    )}
                </div>
            ))}
        </div>
    </div>
);

export default BreakdownModal;