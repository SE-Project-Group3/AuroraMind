// app/components/auth/LoginForm.tsx
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login } from "../api/auth";

interface LoginFormProps {
    onSuccess?: () => void; // 登录成功后，外层想干嘛（跳转等）可以传进来
}

export function LoginForm({ onSuccess }: LoginFormProps) {
    // const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // username = email
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await login({ username: username, password });

            if (res.code === 0 && res.data) {
                const { access_token, token_type } = res.data;

                // 保存 token, 没封装
                localStorage.setItem("access_token", access_token);
                localStorage.setItem("token_type", token_type);

                onSuccess?.();
            } else {
                setError(res.message || "Login failed");
            }
        } catch (err: any) {
            console.error("Login error:", err);

            // axios 有响应，但状态码不是 2xx，比如 401/422/500
            if (err.response) {
                const backendMessage =
                    err.response.data?.message ||
                    err.response.data?.detail ||
                    `Request failed with status ${err.response.status}`;
                setError(backendMessage);
            } else if (err.request) {
                // 请求发出去了，但收不到响应（网络问题 / CORS 被拦）
                setError("Cannot reach server. Please check backend / CORS.");
            } else {
                // 其他错误（代码写错之类）
                setError(err.message || "Unknown error");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Sign in</h2>
                <p className="text-gray-500 text-sm">Built for busy students like you.</p>
            </div>

            {/* Inputs */}
            <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Username */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 ml-1" htmlFor="username">
                        Username
                    </label>
                    <input
                        type="username"
                        id="username"
                        placeholder="Enter your username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all"
                    />
                </div>

                {/* Password */}
                <div className="relative">
                    <label className="block text-xs font-bold text-gray-700 mb-1 ml-1" htmlFor="password">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            placeholder="Enter password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {/* Forgot Password */}
                    <div className="flex justify-end mt-2">
                        <a href="#" className="text-xs font-bold text-blue-500 hover:text-blue-600">
                            Forgot password?
                        </a>
                    </div>
                </div>

                {/* 错误提示 */}
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#0088ff] hover:bg-blue-600 disabled:opacity-70 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-500/30"
                >
                    {loading ? "Signing in..." : "Continue"}
                </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-400">or sign in with</span>
                </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-500 mt-8">
                Don't have an account?{" "}
                <a href="#" className="text-blue-500 font-bold hover:underline">
                    Sign Up
                </a>
            </p>
        </div>
    );
}
