import React, { useState } from 'react';
import { X, Loader2, Circle, List, CheckSquare, Square, Edit3 } from 'lucide-react';
import { GoalService, type BreakdownItem } from '../api/goals';

// 定义带勾选状态的项目类型
interface SelectableItem extends BreakdownItem {
    checked: boolean;
}

interface BreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    goalId: string;
    goalTitle: string;
    onSuccess?: () => void;
}

const BreakdownModal: React.FC<BreakdownModalProps> = ({ isOpen, onClose, goalId, goalTitle, onSuccess }) => {
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    // 🔴 修改状态定义：不再只存 items，而是拆分 summary 和 items
    const [generatedSummary, setGeneratedSummary] = useState('');
    const [items, setItems] = useState<SelectableItem[]>([]);

    if (!isOpen) return null;

    // 导航栏和侧边栏尺寸（如有变化请同步调整）
    const NAV_HEIGHT = 64; // px, 假设TopNavigation高度为64px
    const SIDEBAR_WIDTH = 224; // px, 假设LeftNavigation宽度为224px

    // 逻辑：拆解目标并默认全部勾选
    const handleBreakdown = async () => {
        if (!inputText.trim()) return;
        setLoading(true);
        try {
            const data = await GoalService.breakdownGoal(goalId, inputText);

            if (data && data.length > 0) {
                // 💡 核心逻辑：提取第一项作为 Summary
                const firstItem = data[0];
                const remainingItems = data.slice(1);

                setGeneratedSummary(firstItem.text);

                // 剩下的作为任务列表，默认勾选
                setItems(remainingItems.map(item => ({ ...item, checked: true })));
            } else {
                alert("AI returned empty results.");
            }
        } catch (error) {
            console.error(error);
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
            // 操作 A: 更新 Goal 的 Description (使用第一项)
            // 注意：这里我们使用传入的 goalTitle 和生成的 generatedSummary
            const updateGoalPromise = GoalService.updateGoal(goalId, goalTitle, generatedSummary);

            // 操作 B: 保存选中的 Tasks
            const saveTasksPromise = GoalService.submitBreakdownSelection(goalId, {
                task_list_name: "AI Action Plan",
                items: selectedItems.map(({ order, text }) => ({ order, text }))
            });

            // 并行执行两个请求
            const [updateSuccess, saveSuccess] = await Promise.all([updateGoalPromise, saveTasksPromise]);

            if (updateSuccess && saveSuccess) {
                onSuccess?.();
                onClose();
            } else {
                alert("Partial success: Check network logs.");
                // 即使部分成功也尝试关闭刷新，防止用户卡死
                onSuccess?.();
                onClose();
            }
        } catch (e) {
            console.error("Apply failed", e);
        } finally {
            setSaving(false);
        }
    };

    // 清除状态并关闭
    const handleClose = () => {
        setItems([]);
        setInputText('');
        onClose();
    };

    // 将任务平分为两组（模拟原型图中的 List-A 和 List-B）
    const half = Math.ceil(items.length / 2);
    const groupA = items.slice(0, half);
    const groupB = items.slice(half);

    return (
        <div
            className="fixed z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
            style={{
                top: NAV_HEIGHT,
                left: SIDEBAR_WIDTH,
                right: 0,
                bottom: 0,
                // 只覆盖主内容区，不覆盖导航栏和侧边栏
            }}
        >
            <div
                className={`bg-white rounded-3xl shadow-2xl transition-all duration-500 flex overflow-hidden w-full ${items.length > 0 ? 'max-w-5xl' : 'max-w-2xl'}`}
                style={{
                    maxHeight: '80vh', // 弹窗最大高度
                }}
            >

                {/* --- 左侧面板：输入与引导 --- */}
                <div className={`p-10 flex-1 transition-all ${items.length > 0 ? 'border-r border-gray-100 bg-gray-50/30' : ''}`}
                    style={{ maxHeight: '80vh', overflowY: 'auto' }}
                >
                    {/* 🟢 关闭按钮：现在它相对于左侧面板定位 */}
                    <div className="relative">
                        <button
                            onClick={handleClose}
                            className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all z-30"
                            style={{ transform: 'translate(50%,-50%)' }}
                        >
                            <X size={20} />
                        </button>
                    </div>

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

                {/* --- 右侧面板：结果展示 --- */}
                {items.length > 0 && (
                    <div className="w-1/2 p-10 bg-white flex flex-col animate-in slide-in-from-right duration-500"
                         style={{ maxHeight: '90vh' }}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Action Plan</h2>
                                <p className="text-sm text-gray-400">AI has structured your goal.</p>
                            </div>
                            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-4 space-y-8 custom-scrollbar">

                            {/* 🟢 Section 1: Generated Summary (Goal Description) */}
                            <section className="space-y-3">
                                <h4 className="flex items-center gap-2 text-purple-600 font-bold uppercase tracking-wider text-xs">
                                    <Edit3 size={14} /> New Goal Description
                                </h4>
                                <div className="relative group">
                                    <textarea
                                        value={generatedSummary}
                                        onChange={(e) => setGeneratedSummary(e.target.value)}
                                        className="w-full bg-purple-50/50 p-4 rounded-xl border border-purple-100 text-gray-700 leading-relaxed resize-none focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                                        rows={3}
                                    />
                                    <span className="absolute bottom-2 right-2 text-[10px] text-purple-300 pointer-events-none">
                                        Will update goal description
                                    </span>
                                </div>
                            </section>

                            {/* 🟢 Section 2: Action Steps (Tasks) */}
                            <section className="space-y-3">
                                <h4 className="flex items-center gap-2 text-blue-500 font-bold uppercase tracking-wider text-xs">
                                    <List size={14} /> Action Steps
                                </h4>
                                <div className="space-y-2">
                                    {items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => toggleCheck(idx)}
                                            className={`group flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer
                                                ${item.checked
                                                ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                                                : 'bg-gray-50 border-transparent opacity-60'
                                            }`}
                                        >
                                            <div className={`mt-0.5 transition-colors ${item.checked ? 'text-blue-500' : 'text-gray-300'}`}>
                                                {item.checked ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </div>
                                            <span className={`text-sm leading-relaxed transition-all ${item.checked ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                                                {item.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* 底部按钮 */}
                        <div className="mt-8 space-y-3">
                            <button
                                onClick={handleApply}
                                disabled={saving}
                                className="w-full py-4 bg-blue-500 text-white border border-blue-600 rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                {saving ? <Loader2 className="animate-spin" /> : 'Confirm & Save Plan'}
                            </button>
                            <p className="text-xs text-center text-gray-400">
                                This will update the goal description and add tasks.
                            </p>
                        </div>
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