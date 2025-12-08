import type { Route } from "./+types/login";
import React, { useState } from 'react';
// import { useNavigate } from "react-router-dom";
import { useNavigate } from "react-router";
import { LoginForm } from "../../components/loginForm";
import { RegisterForm } from "../../components/registerForm";

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
    const navigate = useNavigate();
    const [showRegister, setShowRegister] = useState(false);

    console.log("LoginPage rendered!");


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
                            navigate("/app")
                            console.log("login success!");
                        }}
                    />

                    <p className="text-center text-xs text-gray-500 mt-8">
                        Don't have an account?{" "}
                        <button
                            type="button"
                            onClick={() => setShowRegister(true)}
                            className="text-blue-500 font-bold hover:underline"
                        >
                            Sign Up
                        </button>
                    </p>

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

                {/* ============== 注册弹窗 ============== */}
                {showRegister && (
                    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative">
                            {/* 关闭按钮 */}
                            <button
                                type="button"
                                onClick={() => setShowRegister(false)}
                                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-xl"
                            >
                                ×
                            </button>

                            <RegisterForm
                                onSuccess={() => {
                                    console.log("register success!");
                                    navigate("/app")
                                    setShowRegister(false);
                                }}
                            />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
