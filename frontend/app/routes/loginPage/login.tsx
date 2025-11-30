import type { Route } from "./+types/login";
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { login } from "../../api/auth";

import { LoginForm } from "../../components/loginForm"; // 路径按你的项目结构调整

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Login - AuroraMind" },
        { name: "description", content: "Login" },
    ];
}

// loader
export async function loader({}: Route.LoaderArgs) {
    return null;
}

export default function LoginPage() {
    // const [showPassword, setShowPassword] = useState(false);

    return (
        // ================= 1. frame =================
        <div className="min-h-screen w-full relative flex items-center justify-center bg-gray-50 overflow-hidden font-sans">
            {/* background*/}
            {/* pink */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob" />
            {/* yellow */}
            <div className="absolute top-[-20%] left-[30%] w-[400px] h-[400px] bg-yellow-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob animation-delay-2000" />
            {/* blue */}
            <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-blue-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob animation-delay-4000" />
            {/* green */}
            <div className="absolute bottom-[-10%] left-[10%] w-[500px] h-[500px] bg-teal-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob" />

            {/* ================= 2. login card ================= */}
            <div className="relative z-10 w-full max-w-5xl h-[650px] bg-white rounded-[30px] shadow-2xl flex overflow-hidden m-4">
                {/* === Left Side: Form Section === */}
                <div className="w-full md:w-1/2 p-12 flex flex-col justify-center bg-white">

                    {/* LoginForm Component */}
                    <LoginForm
                        onSuccess={() => {
                            // 登录成功后你想做什么，比如跳转 dashboard
                            // navigate("/dashboard") 之类的
                            console.log("login success!");
                        }}
                    />
                </div>

                {/* === Right Side: Branding Section === */}
                <div className="hidden md:flex w-1/2 bg-gradient-to-br from-sky-200 to-blue-600 text-white flex-col items-center justify-center p-12 relative overflow-hidden">
                    <div
                        className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-20"
                        style={{
                            backgroundImage:
                                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)",
                        }}
                    />
                    <div className="relative z-10 text-center max-w-sm">
                        <h1 className="text-4xl font-bold mb-6 drop-shadow-md">AuroraMind</h1>

                        <p className="text-blue-50 text-lg leading-relaxed mb-8 font-medium">
                            Plan long-term goals, organize knowledge, and achieve sustainable development with clarity.
                        </p>

                        <p className="text-2xl font-bold tracking-wide drop-shadow-sm">
                            Learn. Plan. Achieve.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
