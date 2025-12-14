import React from 'react';
import type { GoalUI } from '../api/goals';

interface DashboardGoalItemProps {
    data: GoalUI;
}

const DashboardGoalItem: React.FC<DashboardGoalItemProps> = ({ data }) => {
    return (
        <div className="mb-8 last:mb-0">
            {/* 标题与百分比 */}
            <div className="flex justify-between items-end mb-2">
                <h4 className="text-lg font-medium text-gray-800">{data.title}</h4>
                <span className="text-sm font-bold text-gray-600">{data.progress}%</span>
            </div>

            {/* 进度条区域 - 复用你原有的逻辑 */}
            <div className="relative h-12">
                {/* 灰色背景条 */}
                <div className="absolute top-[20px] left-0 w-full h-1.5 bg-gray-100 rounded-full"></div>

                {/* 蓝色进度条 */}
                <div
                    className="absolute top-[20px] left-0 h-1.5 bg-blue-500 rounded-full z-0 transition-all duration-500"
                    style={{ width: `${data.progress}%` }}
                ></div>

                {/* 时间节点 */}
                <div className="relative z-10 flex justify-between w-full px-1">
                    {data.timeline.map((point, idx) => (
                        <div key={idx} className="flex flex-col items-center group relative top-[13px]">
                            {/* 日期 (斜体显示) */}
                            <span className="absolute -top-6 text-[10px] text-gray-400 mb-1 -rotate-45 origin-bottom-left translate-x-1">
                                {point.date}
                            </span>
                            {/* 圆点 */}
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center bg-white 
                                ${point.done ? 'border-blue-500' : 'border-gray-200'}`}>
                                {point.done && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardGoalItem;