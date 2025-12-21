import axios from "axios";
const API_BASE = "http://127.0.0.1:8080";

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