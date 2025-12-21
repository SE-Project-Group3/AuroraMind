import type { Route } from "./+types/profile";
import React, { useState, useEffect } from 'react';
import { getProfile, updateProfile, logout, type UserProfile, type UpdateProfileRequest} from "../../api/auth";
import axios from 'axios';

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Profile - AuroraMind" },
        { name: "description", content: "Profile" },
    ];
}

// loader
export async function loader({}: Route.LoaderArgs) {
    return null;
}

export default function ProfilePage() {
    // 1. 状态管理
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [newUsername, setNewUsername] = useState('');

    // 模拟的统计数据（通常这些可能来自另一个接口，这里先保留 UI 占位）
    const stats = [
        { label: 'Pending Tasks', value: 15 },
        { label: 'Overdue Tasks', value: 3 },
        { label: 'Tasks Completed', value: 7 },
        { label: 'Goals Achieved', value: 0 },
    ];

    // 2. 初始化：获取用户信息
    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const response = await getProfile();
            if (response.code === 200 && response.data) {
                setUser(response.data);
                setNewUsername(response.data.username);
            }
        } catch (error) {
            console.error("获取用户信息失败", error);
        } finally {
            setLoading(false);
        }
    };

    // 3. 更新用户信息逻辑
    const handleUpdateName = async () => {
        if (!user) return;

        try {
            // 构建请求数据
            // 注意：如果后端 Schema 里 password 也是必填，
            // 但你不想修改密码，通常传 undefined 或不传。
            // 如果后端依然报错 password required，说明后端设计不合理（必须传密码才能改名字）
            const payload: UpdateProfileRequest = {
                username: newUsername,
                email: user.email, // 必须带上当前的 email，因为 PUT 通常是覆盖式更新
                // password: "",   // 除非你要改密码，否则先不要传这个字段
            };

            console.log("正在发送的数据:", payload);

            const response = await updateProfile(payload);

            if (response.code === 200 && response.data) {
                setUser(response.data);
                setIsEditing(false);
                alert("更新成功");
            } else {
                alert(`错误: ${response.message}`);
            }
        } catch (error: any) {
            // 这里打印出后端的详细报错 JSON
            if (error.response && error.response.data) {
                console.error("后端验证错误详情:", error.response.data.detail);
                const errorMsg = error.response.data.detail?.[0]?.msg || "字段验证失败";
                alert(`更新失败: ${errorMsg}`);
            } else {
                alert("网络请求失败");
            }
        }
    };

    // 4. 登出逻辑
    // const handleLogout = () => {
    //     localStorage.removeItem("access_token"); // 清除 token
    //     window.location.href = "/login"; // 跳转到登录页
    // };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="flex-1 bg-gray-50 min-h-screen p-8 font-sans">
            <div className="mb-12">
                <h2 className="text-gray-400 text-lg font-medium">MyProfile</h2>
            </div>

            {/* 个人信息区域 */}
            <div className="flex flex-col items-center justify-center mb-16">
                <div className="relative">
                    <div className="w-28 h-28 rounded-full border-2 border-dashed border-blue-300 p-1.5 flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    {/* 编辑按钮 - 点击切换编辑状态 */}
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="absolute bottom-1 right-1 bg-blue-500 text-white p-1.5 rounded-full shadow-sm hover:bg-blue-600 border-2 border-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                </div>

                {/* 用户名展示与修改 */}
                <div className="mt-4 text-center">
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <input
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                            <button onClick={handleUpdateName} className="text-xs text-blue-600 font-bold">保存</button>
                        </div>
                    ) : (
                        <p className="text-gray-800 font-bold text-lg">{user?.username || 'User'}</p>
                    )}
                    <p className="text-gray-500 text-sm">{user?.email}</p>
                </div>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-20">
                {stats.map((item, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm p-8 flex flex-col items-center justify-center">
                        <h3 className="text-gray-800 font-semibold mb-2">{item.label}</h3>
                        <span className="text-5xl font-bold text-blue-500 my-2">{item.value}</span>
                        <span className="text-gray-400 text-xs">Total</span>
                    </div>
                ))}
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col items-center space-y-4">
                <button
                    onClick={logout}
                    className="w-64 py-3 bg-orange-50 hover:bg-orange-100 text-blue-500 font-medium rounded-lg shadow-sm border border-orange-100 transition-colors"
                >
                    Log Out
                </button>
                <button className="text-gray-300 hover:text-red-400 text-sm transition-colors font-medium">
                    Delete Account
                </button>
            </div>
        </div>
    );
}