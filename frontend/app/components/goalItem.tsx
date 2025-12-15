import React from 'react';
import { Edit2 } from 'lucide-react';
import type { GoalUI } from '../api/goals'; // 引用更新后的类型


//
interface GoalItemProps {
    data: GoalUI;
    onOpenBreakdown: () => void;
    onOpenResource: () => void;
    onEdit?: () => void;
}

const GoalItem: React.FC<GoalItemProps> = ({ data, onOpenBreakdown, onOpenResource, onEdit }) => {
    return (
        <div className="bg-white rounded-xl p-6 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow w-full">
            {/* 顶部标题栏 */}
            <div className="flex items-center gap-2 mb-6">
                <h3 className="text-xl font-medium text-gray-800">{data.title}</h3>
                {/* 调用 onEdit */}
                <button
                    onClick={onEdit}
                    className="text-gray-300 hover:text-gray-500 text-xs flex items-center gap-1 transition-colors"
                >
                    Edit <Edit2 size={12} />
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* 左侧：进度条与描述 */}
                <div className="flex-1">
                    <div className="mb-8 pr-4">
                        <div className="relative pt-6 pb-2">
                            <div className="absolute top-[29px] left-0 w-full h-1.5 bg-gray-100 rounded-full"></div>
                            {/* 进度条 */}
                            <div
                                className="absolute top-[29px] left-0 h-1.5 bg-blue-500 rounded-full z-0 transition-all duration-500"
                                style={{ width: `${data.progress}%` }}
                            ></div>

                            <div className="relative z-10 flex justify-between w-[95%]">
                                {data.timeline.map((point, idx) => (
                                    <div key={idx} className="flex flex-col items-center group">
                    <span className="text-[10px] text-gray-400 mb-1 -rotate-45 origin-bottom-left translate-x-2">
                      {point.date}
                    </span>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center bg-white 
                      ${point.done ? 'border-blue-500' : 'border-gray-200'}`}>
                                            {point.done && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                                        </div>
                                    </div>
                                ))}
                                <div className="absolute -right-6 top-6 text-sm font-bold text-gray-800">{data.progress}%</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 mb-8">
                        <span className="text-gray-500 text-sm font-medium pt-1 shrink-0">Description</span>
                        <p className="text-gray-700 text-sm leading-relaxed">
                            {data.description}
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={onOpenResource}
                            className="flex-1 py-2 px-4 border border-blue-300 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium focus:ring-2 focus:ring-blue-100"
                        >
                            Resource
                        </button>
                        <button
                            onClick={onOpenBreakdown}
                            className="flex-1 py-2 px-4 border border-blue-300 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium focus:ring-2 focus:ring-blue-100"
                        >
                            Break Down
                        </button>
                    </div>
                </div>

                {/* 右侧：清单列表 */}
                <div className="lg:w-[450px] grid grid-cols-2 gap-6 border-l border-gray-50 lg:pl-6">
                    {/* Phase List */}
                    <div className="space-y-4">
                        {data.phases.map(phase => (
                            <div key={phase.id}>
                                <h4 className="text-blue-400 text-xs font-medium mb-2 flex items-center gap-1">
                                    🏷️ {phase.title}
                                </h4>
                                <div className="space-y-2">
                                    {phase.tasks.map((task) => (
                                        <div key={task.id} className="flex items-start gap-2">
                                            {/* 2. 修复渲染逻辑，根据 task.done 决定样式 */}
                                            <div className={`mt-0.5 w-3.5 h-3.5 border rounded flex-shrink-0 cursor-pointer hover:border-blue-400 
                                        ${task.done ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                            </div>

                                            {/* 3. 修复 Error 2: 必须渲染 task.text，不能直接渲染 task 对象 */}
                                            <span className={`text-xs text-gray-700 leading-tight ${task.done ? 'line-through text-gray-400' : ''}`}>
                                        {task.text}
                                     </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Standard List */}
                    <div className="space-y-4">
                        {data.lists.map(list => (
                            <div key={list.id}>
                                <h4 className="text-blue-400 text-xs font-medium mb-2 flex items-center gap-1">
                                    📑 {list.title}
                                </h4>
                                <div className="space-y-2">
                                    {list.tasks.map((task) => (
                                        <div key={task.id} className="flex items-start gap-2">
                                            <div className={`mt-0.5 w-3.5 h-3.5 border rounded flex-shrink-0 cursor-pointer hover:border-blue-400 
                                        ${task.done ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                            </div>

                                            {/* 同样修复这里 */}
                                            <span className={`text-xs text-gray-700 leading-tight ${task.done ? 'line-through text-gray-400' : ''}`}>
                                        {task.text}
                                     </span>

                                            <div className="ml-auto w-3 h-3 border border-gray-200 rounded-sm"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoalItem;
