import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Save, Edit3 } from 'lucide-react';
import type { GoalUI, TaskGroup, UiTask } from '../api/goals';
import { GoalService } from '../api/goals';

interface GoalEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    goal: GoalUI | null;
    onGoalUpdated: () => void; // 通知父组件数据变了，需要重新 fetch
}

const GoalEditModal: React.FC<GoalEditModalProps> = ({ isOpen, onClose, goal, onGoalUpdated }) => {
    const [localGoal, setLocalGoal] = useState<GoalUI | null>(null);
    const [editingTitle, setEditingTitle] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");

    // 初始化本地状态
    useEffect(() => {
        if (goal) {
            setLocalGoal(goal);
            setNewTitle(goal.title);
            setNewDesc(goal.description);
        }
    }, [goal]);

    if (!isOpen || !localGoal) return null;

    // --- Goal 基础信息修改 ---
    const handleSaveGoalInfo = async () => {
        if (!localGoal) return;
        await GoalService.updateGoal(localGoal.id, newTitle, newDesc);
        setEditingTitle(false);
        onGoalUpdated(); // 刷新数据
    };

    // --- Phase 操作 ---
    const handleAddPhase = async () => {
        const name = prompt("Enter phase name:");
        if (!name) return;
        const success = await GoalService.createPhase(localGoal.id, name);
        if (success) onGoalUpdated();
    };

    const handleDeletePhase = async (phaseId: string) => {
        if (!confirm("Delete this phase and all its tasks?")) return;
        const success = await GoalService.deletePhase(phaseId);
        if (success) onGoalUpdated();
    };

    const handleEditPhaseName = async (phaseId: string, currentName: string) => {
        const newName = prompt("Edit phase name:", currentName);
        if (!newName || newName === currentName) return;
        const success = await GoalService.updatePhase(phaseId, newName);
        if (success) onGoalUpdated();
    };

    // --- Task 操作 ---
    const handleAddTask = async (phaseId: string) => {
        const name = prompt("Enter task name:");
        if (!name) return;
        const success = await GoalService.createPhaseTask(phaseId, name);
        if (success) onGoalUpdated();
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm("Delete this task?")) return;
        const success = await GoalService.deletePhaseTask(taskId);
        if (success) onGoalUpdated();
    };

    const handleToggleTask = async (task: UiTask) => {
        // 乐观更新 UI (可选)，这里为了简单直接调接口刷新
        const success = await GoalService.updatePhaseTask(task.id, task.text, !task.done);
        if (success) onGoalUpdated();
    };

    const handleEditTaskName = async (task: UiTask) => {
        const newName = prompt("Edit task name:", task.text);
        if (!newName || newName === task.text) return;
        const success = await GoalService.updatePhaseTask(task.id, newName, task.done);
        if (success) onGoalUpdated();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-gray-50">
                    <div className="flex-1 mr-8">
                        {editingTitle ? (
                            <div className="space-y-3">
                                <input
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full text-xl font-bold border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                                <textarea
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    className="w-full text-sm text-gray-600 border border-blue-300 rounded px-2 py-1 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleSaveGoalInfo} className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                                        <Save size={14} /> Save
                                    </button>
                                    <button onClick={() => setEditingTitle(false)} className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded hover:bg-gray-300">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center gap-2 group">
                                    <h2 className="text-2xl font-bold text-gray-800">{localGoal.title}</h2>
                                    <button onClick={() => setEditingTitle(true)} className="text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Edit3 size={16} />
                                    </button>
                                </div>
                                <p className="text-gray-500 mt-1 text-sm line-clamp-2">{localGoal.description}</p>
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full p-1 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8">

                    {/* Phases Section */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-700">Phases & Tasks</h3>
                            <button
                                onClick={handleAddPhase}
                                className="flex items-center gap-1 text-sm text-blue-500 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                            >
                                <Plus size={16} /> Add Phase
                            </button>
                        </div>

                        {/* Phase List */}
                        {localGoal.phases.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                                No phases yet. Click "Add Phase" to start planning.
                            </div>
                        ) : (
                            localGoal.phases.map((phase) => (
                                <div key={phase.id} className="bg-gray-50 rounded-xl p-5 border border-gray-100 group/phase">

                                    {/* Phase Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Phase</span>
                                            <h4 className="font-semibold text-gray-800">{phase.title}</h4>
                                            <button onClick={() => handleEditPhaseName(phase.id, phase.title)} className="text-gray-300 hover:text-blue-500">
                                                <Edit3 size={14} />
                                            </button>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover/phase:opacity-100 transition-opacity">
                                            <button onClick={() => handleDeletePhase(phase.id)} className="text-gray-400 hover:text-red-500 p-1">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Task List in Phase */}
                                    <div className="space-y-2 pl-2">
                                        {phase.tasks.map((task) => (
                                            <div key={task.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow group/task">

                                                {/* Checkbox */}
                                                <button
                                                    onClick={() => handleToggleTask(task)}
                                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                            ${task.done ? 'bg-blue-500 border-blue-500' : 'border-gray-300 hover:border-blue-400 bg-white'}`}
                                                >
                                                    {task.done && <Check size={12} className="text-white" />}
                                                </button>

                                                {/* Task Name */}
                                                <span className={`flex-1 text-sm ${task.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                          {task.text}
                        </span>

                                                {/* Task Actions */}
                                                <div className="flex gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEditTaskName(task)} className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-gray-50 rounded">
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Add Task Button */}
                                        <button
                                            onClick={() => handleAddTask(phase.id)}
                                            className="w-full py-2 flex items-center justify-center gap-1 text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all mt-3"
                                        >
                                            <Plus size={14} /> Add Task
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                    <button onClick={onClose} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                        Done
                    </button>
                </div>

            </div>
        </div>
    );
};

export default GoalEditModal;