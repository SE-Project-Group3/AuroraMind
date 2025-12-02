// api/auth.ts
import axios from "axios";
const API_BASE = "http://127.0.0.1:8080";

// login
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


// register
interface RegisterPayload {
    username: string;
    email: string;
    password: string;
}

interface RegisterResponse {
    code: number;
    message: string;
    data?: {
        username: string;
        email: string;
        id: string;
        created_at: string;
        is_active: boolean;
    };
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
    const res = await axios.post<RegisterResponse>(
        `${API_BASE}/api/v1/register`,   // 反引号
        payload,
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );
    return res.data;
}