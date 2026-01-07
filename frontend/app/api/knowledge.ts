import axios from "axios";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

export interface knowledgeDocument {
    "id": string,
    "goal_id"?: string,
    "original_filename": string,
    "stored_filename": string,
    "mime_type": string,
    "file_size": number,
    "status": string,
    "ingest_progress": number,
    "chunk_count": number,
    "error_message": string,
    "created_at": string
}

export async function listKnowledgeDocuments(): Promise<knowledgeDocument[]> {
    const token = localStorage.getItem("access_token");
    const res = await axios.get(`${API_BASE}/api/v1/knowledge-base/documents`, {
        headers: {
                "Content-Type": "application/json",
                 Authorization: token ? `Bearer ${token}` : ""
            },
    });
    return res.data.data;
}

export async function listDefaultKnowledgeDocuments(): Promise<knowledgeDocument[]> {
    const token = localStorage.getItem("access_token");
    const res = await axios.get(`${API_BASE}/api/v1/knowledge-base/documents/unassigned`, {
        headers: {
                "Content-Type": "application/json",
                 Authorization: token ? `Bearer ${token}` : ""
            },
    });
    return res.data.data;
}

export async function listKnowledgeDocumentsByGoal(goal_id: string): Promise<knowledgeDocument[]> {
    const token = localStorage.getItem("access_token");
    const res = await axios.get(`${API_BASE}/api/v1/knowledge-base/documents/${goal_id}`, {
        headers: {
                "Content-Type": "application/json",
                 Authorization: token ? `Bearer ${token}` : ""
            },
    });
    return res.data.data;
}

export async function uploadKnowledgeDocument(file: File, goal_id = null): Promise<knowledgeDocument> {
    const token = localStorage.getItem("access_token");
    const formData = new FormData();
    formData.append("file", file);
    if (goal_id) {
        formData.append("goal_id", goal_id);
    }

    const res = await axios.post(`${API_BASE}/api/v1/knowledge-base/documents`, formData, {
        headers: {
            Authorization: token ? `Bearer ${token}` : ""
        }
    });
    return res.data.data;
}

export async function downloadKnowledgeDocument(documentId: string): Promise<Blob> {
    const token = localStorage.getItem("access_token");
    const res = await axios.get(`${API_BASE}/api/v1/knowledge-base/documents/${documentId}/file`, {
        headers: {
                "Content-Type": "application/json",
                Authorization: token ? `Bearer ${token}` : ""
            },
        responseType: 'blob'
    });
    return res.data;
}

export async function deleteKnowledgeDocument(documentId: string): Promise<boolean> {
    const token = localStorage.getItem("access_token");
    const res = await axios.delete(`${API_BASE}/api/v1/knowledge-base/documents/${documentId}`, {
        headers: {
                "Content-Type": "application/json",
                Authorization: token ? `Bearer ${token}` : ""
            },
    });
    return res.status === 200;
}

export async function streamConversation(
    message: string, 
    documentIds: string[] | null, 
    onChunk: (text: string) => void,
    onMeta: (conversation_id: string) => void,
    onContext?: (context: any) => void, // Optional: to handle the 'context' event later
    conversation_id: string | null = null
): Promise<void> {
    const token = localStorage.getItem("access_token");

    const response = await fetch(`${API_BASE}/api/v1/knowledge-base/conversation/stream`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
            question: message,
            top_k: 8,
            document_ids: documentIds,
            conversation_id: conversation_id
        })
    });

    if (!response.ok || !response.body) {
        throw new Error(`Streaming failed: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // 1. Decode new chunk and append to buffer
        buffer += decoder.decode(value, { stream: true });

        // 2. Split by double newline (standard SSE message delimiter)
        const parts = buffer.split('\n\n');
        
        // 3. Keep the last part in buffer (it might be incomplete)
        buffer = parts.pop() || ''; 

        // 4. Process complete messages
        for (const part of parts) {
            const lines = part.split('\n');
            let eventType = '';
            let data = '';

            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    eventType = line.slice(7).trim();
                } else if (line.startsWith('data: ')) {
                    data = line.slice(6).trim();
                }
            }

            // 5. Route based on event type
            if (eventType === 'delta' && data) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.text) {
                        onChunk(parsed.text);
                    }
                } catch (e) {
                    console.error("Failed to parse delta JSON", e);
                }
            } else if (eventType === 'meta' && data) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.conversation_id) {
                        onMeta(parsed.conversation_id);
                    }
                } catch (e) {
                    console.error("Failed to parse meta JSON", e);
                }
            } else if (eventType === 'context' && data && onContext) {
                try {
                    const parsed = JSON.parse(data);
                    onContext(parsed);
                } catch (e) {
                    console.error("Failed to parse context JSON", e);
                }
            } else if (eventType === 'done') {
                // Stream finished
                return;
            }
        }
    }
}