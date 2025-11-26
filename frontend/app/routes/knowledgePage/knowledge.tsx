import type { Route } from "./+types/knowledge";
import React from 'react';
import {
    FolderOpen,
    FileText,
    Search,
    Plus,
    ArrowUpCircle
} from 'lucide-react';

import './knowledge.scss'

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Knowledge - AuroraMind" },
        { name: "description", content: "Knowledge" },
    ];
}

// loader
export async function loader({}: Route.LoaderArgs) {
    return null;
}


export default function KnowledgeBasePage() {
    return (
        // 外层容器：使用 Tailwind 控制布局
        <div className="flex flex-col h-full w-full mt-20 bg-[#F3F4F6] p-6 overflow-hidden box-border">

            {/* ---------------- Top Section: Folder Tabs ---------------- */}
            <header className="flex items-center space-x-4 mb-4 flex-shrink-0">
                <button className="flex items-center space-x-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-medium text-sm border border-blue-100 transition-colors">
                    <FolderOpen size={16} className="fill-blue-600 text-blue-600" />
                    <span>Goal–A Folder</span>
                </button>
                <button className="flex items-center space-x-2 bg-white text-gray-500 px-4 py-2 rounded-xl font-medium text-sm hover:bg-gray-50 border border-transparent transition-colors">
                    <FolderOpen size={16} />
                    <span>Goal–B Folder</span>
                </button>
            </header>

            {/* ---------------- Main Grid ---------------- */}
            <div className="flex flex-row gap-6 h-full overflow-hidden">

                {/* === Left Column: File List === */}
                <aside className="w-[280px] flex-shrink-0 flex flex-col bg-white rounded-2xl p-4 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-center text-gray-800 mb-4 mt-2">File List</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search"
                                className="w-full bg-gray-50 text-sm pl-9 pr-3 py-2 rounded-lg border-none outline-none focus:ring-1 focus:ring-blue-200 placeholder-gray-400"
                            />
                        </div>
                    </div>

                    {/* List Items (kb-scroll-area 美化滚动条) */}
                    <div className="flex-1 overflow-y-auto space-y-2 kb-scroll-area">
                        <div className="flex items-start p-3 bg-blue-50 rounded-lg cursor-pointer border border-blue-100">
                            <FileText className="text-blue-500 mt-0.5 flex-shrink-0" size={16} />
                            <span className="ml-2 text-xs font-medium text-blue-900 leading-snug">
                Designing Data–Intensive Applications.pdf
              </span>
                        </div>
                    </div>

                    <button className="mt-4 flex items-center justify-center space-x-1 text-blue-500 hover:text-blue-600 text-sm font-medium py-2 transition-colors">
                        <Plus size={16} />
                        <span>Upload a new file</span>
                    </button>
                </aside>

                {/* === Middle Column: Content === */}
                <main className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="px-8 py-5 border-b border-gray-100 bg-white flex justify-center items-center flex-shrink-0">
                        <h3 className="font-semibold text-gray-800 text-sm">Designing Data–Intensive Applications.pdf</h3>
                    </div>

                    {/* Scrollable Area: 加上 kb-scroll-area 类名 */}
                    <div className="flex-1 overflow-y-auto p-12 kb-scroll-area">
                        {/* 这里的 max-w-3xl 控制文字宽度不要太宽，kb-article 控制排版样式 */}
                        <article className="max-w-3xl mx-auto kb-article">
                            <h1>Chapter 1. Trade-offs in Data Systems Architecture</h1>
                            <p>
                                Content.
                            </p>

                        </article>
                    </div>
                </main>

                {/* === Right Column: AI Chat === */}
                <aside className="w-[360px] flex-shrink-0 flex flex-col bg-white rounded-2xl p-6 shadow-sm justify-between">
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="mb-4 text-center">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">Where should we begin?</h3>
                            <p className="text-xs text-gray-400 max-w-[200px] mx-auto">
                                description.
                            </p>
                        </div>
                    </div>

                    <div className="relative w-full">
                        <div className="flex items-center gap-2 p-2 bg-white rounded-full border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <button className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors">
                                <Plus size={18} />
                            </button>
                            <input
                                type="text"
                                placeholder="Ask a question..."
                                className="flex-1 text-sm text-gray-700 outline-none bg-transparent"
                            />
                            <button className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors">
                                <ArrowUpCircle size={20} />
                            </button>
                        </div>
                    </div>
                </aside>

            </div>
        </div>
    );
}
