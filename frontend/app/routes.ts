import { type RouteConfig } from "@react-router/dev/routes";

export default [
    // 登录页
    {
        path: "/",
        file: "routes/loginPage/login.tsx",  // 这里最好也带 routes/ 前缀
    },

    // 主应用布局
    {
        path: "/app",
        file: "routes/app-layout.tsx",
        children: [
            {
                index: true,                     // /app -> routes/dashboard.tsx
                file: "routes/dashboardPage/dashboard.tsx",
            },
            {
                path: "goals",
                file: "routes/goalsPage/goals.tsx",
            },
            {
                path: "todo",
                file: "routes/todoPage/todolist.tsx",
            },
            {
                path: "knowledge",
                file: "routes/knowledgePage/knowledge.tsx",
            },
            {
                path: "summary",
                file: "routes/summaryPage/summary.tsx",
            },
            {
                path: "profile",
                file: "routes/profilePage/profile.tsx",
            },
        ],
    },
] satisfies RouteConfig;
