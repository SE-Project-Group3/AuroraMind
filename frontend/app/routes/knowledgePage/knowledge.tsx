import type { Route } from "./+types/knowledge";
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    FolderOpen,
    FileText,
    Search,
    Plus,
    ArrowUpCircle,
    Loader2,
    Check,
    Trash2
} from 'lucide-react';

import './knowledge.scss'
import { 
    listKnowledgeDocuments, 
    uploadKnowledgeDocument, 
    downloadKnowledgeDocument,
    streamConversation,
    type knowledgeDocument 
} from "~/api/knowledge";
import { GoalService, type GoalUI } from "~/api/goals";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Knowledge - AuroraMind" },
        { name: "description", content: "Knowledge" },
    ];
}

interface StoredChat {
    conversationId: string | null;
    messages: {role: string, content: string}[];
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
    
    // --- Data State ---
    const [docs, setDocs] = useState<knowledgeDocument[]>(initialDocs);
    const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    
    // --- Chat State ---
    const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
    const [input, setInput] = useState("");
    const [chatSelectedDocIds, setChatSelectedDocIds] = useState<string[]>([]);
    const [isDocSelectorOpen, setIsDocSelectorOpen] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);

    // UI State
    const [isUploading, setIsUploading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const docSelectorRef = useRef<HTMLDivElement>(null);
    const isMounted = useRef(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // --- STORAGE HELPERS ---
    const getStorageKey = (goalId: string | null) => `chat_history_${goalId ?? 'default'}`;

    const saveCurrentChat = (goalId: string | null, msgs: typeof messages, convId: string | null) => {
        const data: StoredChat = { conversationId: convId, messages: msgs };
        localStorage.setItem(getStorageKey(goalId), JSON.stringify(data));
    };

    const loadChat = (goalId: string | null) => {
        const stored = localStorage.getItem(getStorageKey(goalId));
        if (stored) {
            try {
                const data: StoredChat = JSON.parse(stored);
                setMessages(data.messages || []);
                setConversationId(data.conversationId || null);
            } catch (e) {
                console.error("Failed to parse chat history", e);
                setMessages([]);
                setConversationId(null);
            }
        } else {
            setMessages([]);
            setConversationId(null);
        }
    };

    const clearHistory = () => {
        if(confirm("Clear chat history for this folder?")) {
            setMessages([]);
            setConversationId(null);
            localStorage.removeItem(getStorageKey(activeGoalId));
        }
    };

    // Filter documents based on active folder
    const filteredDocs = useMemo(() => {
        return docs.filter(doc => {
            if (activeGoalId === null) {
                return !doc.goal_id;
            }
            return doc.goal_id === activeGoalId;
        });
    }, [docs, activeGoalId]);

    // Auto-Select First File on Folder Change
    useEffect(() => {
        setChatSelectedDocIds([]); // CHANGE: Reset to empty array
        if (filteredDocs.length > 0) {
            setSelectedDocId(filteredDocs[0].id);
        } else {
            setSelectedDocId(null);
            setPdfUrl(null);
        }
        loadChat(activeGoalId);
    }, [activeGoalId, docs]);

    // Load PDF Content when Selection Changes
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
        return () => { isMounted = false; };
    }, [selectedDocId]);

    // Cleanup Object URL
    useEffect(() => {
        return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
    }, [pdfUrl]);

    // Handle Click Outside to Close Selector
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (docSelectorRef.current && !docSelectorRef.current.contains(event.target as Node)) {
                setIsDocSelectorOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, []);

    // Save chat to local storage
    useEffect(() => {
        if (isMounted.current) {
            if (messages.length > 0 || conversationId) {
                saveCurrentChat(activeGoalId, messages, conversationId);
            }
        } else {
            isMounted.current = true;
        }
    }, [messages, conversationId, activeGoalId]);

    // Auto-scroll chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);


    // Handlers
    const handleFolderClick = (goalId: string | null) => setActiveGoalId(goalId);
    const handleFileClick = (docId: string) => setSelectedDocId(docId);
    const handleUploadClick = () => fileInputRef.current?.click();

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
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const activeDocName = useMemo(() => {
        return filteredDocs.find(d => d.id === selectedDocId)?.original_filename;
    }, [filteredDocs, selectedDocId]);

    const toggleChatDoc = (docId: string) => {
        setChatSelectedDocIds(prev => 
            prev.includes(docId)
                ? prev.filter(id => id !== docId)
                : [...prev, docId]
        );
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;
        
        const userMsg = { role: 'user', content: input };
        const botMsgPlaceholder = { role: 'assistant', content: '' };
        
        setMessages(prev => [...prev, userMsg, botMsgPlaceholder]);
        const currentInput = input;
        setInput(''); 

        try {
            await streamConversation(
                currentInput, 
                chatSelectedDocIds,
                (textChunk) => {
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMsg = newMessages[newMessages.length - 1];
                        lastMsg.content += textChunk;
                        return newMessages;
                    });
                },
                (newConvId) => {
                    setConversationId(newConvId);
                },
                (context) => {
                    console.log("Received context:", context);
                },
                conversationId 
            );
        } catch (error) {
            console.error("Chat error", error);
        }
    };

    return (
        <div className="knowledge-page">
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
                                    className={`file-item ${selectedDocId === doc.id ? 'active' : ''}`}
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

                <main className="main-content">
                    <div className="content-header">
                        <h3>{activeDocName || "Document Viewer"}</h3>
                    </div>
                    
                    <div className="content-body kb-scroll-area">
                        {pdfUrl ? (
                            <div className="pdf-viewer-container">
                                <iframe 
                                    src={pdfUrl} 
                                    title="PDF Viewer"
                                />
                            </div>
                        ) : (
                            <div className="empty-state">
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

                <aside className="sidebar-right">
                    <div className="chat-placeholder">
                        {messages.length > 0 && (
                            <div className="chat-actions">
                                <button onClick={clearHistory} className="clear-btn">
                                    <Trash2 size={12} /> Clear Chat
                                </button>
                            </div>
                        )}
                        
                        {messages.length === 0 ? (
                            <div className="empty-chat">
                                <h3>Where should we begin?</h3>
                                <p>Select a document to start chatting about it.</p>
                            </div>
                        ) : (
                            <div className="chat-messages kb-scroll-area">
                                {messages.map((m, i) => (
                                    <div key={i} className={`message-row ${m.role === 'user' ? 'user' : 'assistant'}`}>
                                        <div className="message-bubble">
                                            {m.content}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>
                    
                    <div className="chat-input-area" ref={docSelectorRef}>
                        {isDocSelectorOpen && (
                           <div className="doc-selector">
                                <div className="ds-header">
                                    Select context
                                </div>
                                <div className="ds-list kb-scroll-area">
                                    {filteredDocs.length === 0 ? (
                                        <div className="p-3 text-sm text-gray-400 text-center">No docs available</div>
                                    ) : (
                                        filteredDocs.map(doc => {
                                            const isSelected = chatSelectedDocIds.includes(doc.id);
                                            return (
                                                <div 
                                                    key={doc.id} 
                                                    onClick={() => toggleChatDoc(doc.id)} 
                                                    className={`ds-item ${isSelected ? 'selected' : ''}`}
                                                >
                                                    <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
                                                        {isSelected && <Check size={12} strokeWidth={3} />}
                                                    </div>
                                                    <span title={doc.original_filename}>{doc.original_filename}</span>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                           </div>
                        )}

                        <div className="input-wrapper">
                            <button 
                                className={`icon-btn ${isDocSelectorOpen || chatSelectedDocIds.length > 0 ? 'active' : ''}`} 
                                onClick={() => setIsDocSelectorOpen(!isDocSelectorOpen)} 
                                title="Select documents for context"
                            >
                                <div className="badge-wrapper">
                                    <Plus size={18} />
                                    {chatSelectedDocIds.length > 0 && (
                                        <span className="badge-ping">
                                          <span className="ping-animation"></span>
                                          <span className="badge-dot"></span>
                                        </span>
                                    )}
                                </div>
                            </button>
                            
                            <textarea 
                                ref={textareaRef}
                                rows={1}
                                placeholder="Ask a question..." 
                                value={input} 
                                onChange={(e) => setInput(e.target.value)} 
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault(); 
                                        handleSendMessage();
                                    }
                                }}
                            />

                            <button 
                                className="icon-btn send-btn" 
                                onClick={handleSendMessage}
                            >
                                <ArrowUpCircle size={20} />
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}