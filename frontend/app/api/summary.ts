import axios from "axios";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

export interface SummaryItem {
    id: string;
    summary_type: "weekly" | "monthly";
    period_start: string;
    content: string;
    status: string;
}

// 内部使用的获取配置工具
const getRequestConfig = () => {
    if (typeof window === "undefined") return { headers: {} };
    const token = localStorage.getItem("access_token");
    return {
        headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : ""
        }
    };
};

export const SummaryService = {
    async getWeekly(): Promise<SummaryItem[]> {
        const res = await axios.get(`${API_BASE}/api/v1/summaries/weekly`, getRequestConfig());
        return res.data.data || [];
    },

    async getMonthly(): Promise<SummaryItem[]> {
        const res = await axios.get(`${API_BASE}/api/v1/summaries/monthly`, getRequestConfig());
        return res.data.data || [];
    },

    async generate(type: string, date: string) {
        const res = await axios.post(`${API_BASE}/api/v1/summaries/generate`, {
            summary_type: type,
            period_start: date,
            period_end: date,
            force: true
        }, getRequestConfig());
        return res.data.data;
    }
};