import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { register } from "../api/auth";

interface RegisterFormProps {
    onSuccess?: () => void;   // 注册成功后关闭弹窗 / 提示
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
    const [username, setUsername] = useState("");
    const [email, setEmail]     = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm]   = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm]   = useState(false);

    const [error, setError]   = useState<string | null>(null);
    const [info, setInfo]     = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setInfo(null);

        if (!username || !email || !password) {
            setError("Please fill in all required fields.");
            return;
        }

        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const res = await register({ username, email, password });
            console.log("register response:", res);

            if (res.code === 0 && res.data) {
                setInfo("Registration successful! You can now log in.");
                // 这里可以直接关闭弹窗，也可以让用户自己点关闭
                onSuccess?.();
            } else {
                setError(res.message || "Registration failed");
            }
        } catch (err: any) {
            console.error("Register error:", err);
            if (err.response) {
                const backendMessage =
                    err.response.data?.message ||
                    err.response.data?.detail ||
                    `Request failed with status ${err.response.status}`;
                setError(backendMessage);
            } else if (err.request) {
                setError("Cannot reach server. Please check backend / CORS.");
            } else {
                setError(err.message || "Unknown error");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="space-y-4" onSubmit={handleSubmit}>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Create an account</h2>

            {/* username */}
            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1" htmlFor="reg-username">
                    Username
                </label>
                <input
                    id="reg-username"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all"
                />
            </div>

            {/* email */}
            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1" htmlFor="reg-email">
                    Email
                </label>
                <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all"
                />
            </div>

            {/* password */}
            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1" htmlFor="reg-password">
                    Password
                </label>
                <div className="relative">
                    <input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter password"
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
            </div>

            {/* confirm password */}
            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1" htmlFor="reg-confirm">
                    Confirm Password
                </label>
                <div className="relative">
                    <input
                        id="reg-confirm"
                        type={showConfirm ? "text" : "password"}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            {/* 错误 / 成功 提示 */}
            {error && <p className="text-xs text-red-500">{error}</p>}
            {info && <p className="text-xs text-green-600">{info}</p>}

            {/* 提交按钮 */}
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0088ff] hover:bg-blue-600 disabled:opacity-70 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-500/30"
            >
                {loading ? "Signing up..." : "Sign Up"}
            </button>
        </form>
    );
}
