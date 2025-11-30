// api/auth.ts
import axios from "axios";
const API_BASE = "http://127.0.0.1:8080";

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    code: number;
    message: string;
    data?: {
        access_token: string;
        token_type: string; // "bearer"
        expires_in: number; // 过期秒数
    };
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
    const res = await axios.post<LoginResponse>(
        `${API_BASE}/api/v1/login`,
        payload,
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );
    return res.data;
}
