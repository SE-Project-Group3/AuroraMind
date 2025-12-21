import type { Route } from "./+types/knowledge";
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    FolderOpen,
    FileText,
    Search,
    Plus,
    ArrowUpCircle,
    Loader2
} from 'lucide-react';

import './knowledge.scss'
import { 
    listKnowledgeDocuments, 
    uploadKnowledgeDocument, 
    downloadKnowledgeDocument,
    type knowledgeDocument 
} from "~/api/knowledge";
import { GoalService, type GoalUI } from "~/api/goals";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Knowledge - AuroraMind" },
        { name: "description", content: "Knowledge" },
    ];
}

export const handle = {
    clientLoader: true,
};

export function HydrateFallback() {
  return <div>Loading...</div>;
}

export async function clientLoader({}: Route.LoaderArgs) {
    const initialDocs = await listKnowledgeDocuments();
    const goals = await GoalService.getAllGoals();
    return { initialDocs, goals };
}
clientLoader.hydrate = true;

export default function KnowledgeBasePage({loaderData}: Route.ComponentProps) {
    const { initialDocs, goals } = loaderData as { initialDocs: knowledgeDocument[], goals: GoalUI[] };
    
    // State
    const [docs, setDocs] = useState<knowledgeDocument[]>(initialDocs);
    const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    
    // UI State
    const [isUploading, setIsUploading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // 1. Filter documents based on active folder
    const filteredDocs = useMemo(() => {
        return docs.filter(doc => {
            if (activeGoalId === null) {
                return !doc.goal_id;
            }
            return doc.goal_id === activeGoalId;
        });
    }, [docs, activeGoalId]);

    // 2. Auto-Select First File on Folder Change
    useEffect(() => {
        if (filteredDocs.length > 0) {
            setSelectedDocId(filteredDocs[0].id);
        } else {
            setSelectedDocId(null);
            setPdfUrl(null);
        }
    }, [activeGoalId, docs]); // Runs when folder changes or new file uploaded

    // 3. Load PDF Content when Selection Changes
    useEffect(() => {
        let isMounted = true;

        async function loadContent() {
            if (!selectedDocId) {
                if (isMounted) setPdfUrl(null);
                return;
            }

            setIsLoadingPdf(true);
            try {
                const blob = await downloadKnowledgeDocument(selectedDocId);
                if (isMounted) {
                    const url = URL.createObjectURL(blob);
                    setPdfUrl(url);
                }
            } catch (error) {
                console.error("Failed to load PDF", error);
                if (isMounted) setPdfUrl(null);
            } finally {
                if (isMounted) setIsLoadingPdf(false);
            }
        }

        loadContent();

        return () => {
            isMounted = false;
        };
    }, [selectedDocId]);

    // 4. Cleanup Object URL
    useEffect(() => {
        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [pdfUrl]);


    // Handlers
    const handleFolderClick = (goalId: string | null) => {
        setActiveGoalId(goalId);
    };

    const handleFileClick = (docId: string) => {
        setSelectedDocId(docId);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const newDoc = await uploadKnowledgeDocument(file, activeGoalId as any);
            setDocs(prev => [...prev, newDoc]);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload file. Please try again.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Helper to get active document name safely
    const activeDocName = useMemo(() => {
        return filteredDocs.find(d => d.id === selectedDocId)?.original_filename;
    }, [filteredDocs, selectedDocId]);

    return (
        <div className="knowledge-page">

            {/* --- Header --- */}
            <header className="page-header">
                <button 
                    className={`folder-btn ${activeGoalId === null ? 'active' : 'inactive'}`}
                    onClick={() => handleFolderClick(null)}
                >
                    <FolderOpen size={16} />
                    <span>Default Folder</span>
                </button>

                {goals.map((goal) => (
                    <button 
                        key={goal.id}
                        className={`folder-btn ${activeGoalId === goal.id ? 'active' : 'inactive'}`}
                        onClick={() => handleFolderClick(goal.id)}
                    >
                        <FolderOpen size={16} />
                        <span>{goal.title} Folder</span>
                    </button>
                ))}
            </header>

            <div className="content-grid">

                {/* --- Left Sidebar --- */}
                <aside className="sidebar-left">
                    <div className="search-section">
                        <h2>File List</h2>
                        <div className="search-wrapper">
                            <Search className="search-icon" size={14} />
                            <input type="text" placeholder="Search" />
                        </div>
                    </div>

                    <div className="file-list kb-scroll-area">
                        {filteredDocs.length === 0 ? (
                            <div className="p-4 text-center text-gray-400 text-sm">
                                No files in this folder.
                            </div>
                        ) : (
                            filteredDocs.map((doc) => (
                                <div 
                                    key={doc.id} 
                                    className={`file-item ${selectedDocId === doc.id ? 'bg-blue-100 border-blue-200' : ''}`}
                                    onClick={() => handleFileClick(doc.id)}
                                >
                                    <FileText className="file-icon" size={16} />
                                    <span title={doc.original_filename}>
                                        {doc.original_filename}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                    <button className="upload-btn" onClick={handleUploadClick} disabled={isUploading}>
                        {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                        <span>{isUploading ? "Uploading..." : "Upload a new file"}</span>
                    </button>
                </aside>

                {/* --- Main Content (PDF View) --- */}
                <main className="main-content">
                    <div className="content-header">
                        <h3>{activeDocName || "Document Viewer"}</h3>
                    </div>
                    
                    <div className="content-body kb-scroll-area" style={{ padding: 0, height: '100%' }}>
                        {pdfUrl ? (
                            <iframe 
                                src={pdfUrl} 
                                width="100%" 
                                height="100%" 
                                style={{ border: 'none', display: 'block' }}
                                title="PDF Viewer"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                {isLoadingPdf ? (
                                    <>
                                        <Loader2 className="animate-spin" size={24} />
                                        <span>Loading document...</span>
                                    </>
                                ) : (
                                    <span>
                                        {filteredDocs.length === 0 
                                            ? "No files in this folder." 
                                            : "Select a document to preview."}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </main>

                {/* --- Right Sidebar (Chat) --- */}
                <aside className="sidebar-right">
                    <div className="chat-placeholder">
                        <div className="text-group">
                            <h3>Where should we begin?</h3>
                            <p>Select a document to start chatting about it.</p>
                        </div>
                    </div>
                    <div className="chat-input-area">
                        <div className="input-wrapper">
                            <button className="icon-btn"><Plus size={18} /></button>
                            <input type="text" placeholder="Ask a question..." />
                            <button className="icon-btn"><ArrowUpCircle size={20} /></button>
                        </div>
                    </div>
                </aside>

            </div>
        </div>
    );
}