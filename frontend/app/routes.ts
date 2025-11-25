import { type RouteConfig } from "@react-router/dev/routes";

export default [
    // 欢迎页：没有 sidebar 的单独页面
    {
        path: "/",
        file: "routes/welcome/welcome.tsx",  // 注意这里最好也带 routes/ 前缀
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
                file: "routes/profilePage/profile.tsx", // 这行你原来写的是 summary.tsx，注意一下
            },
        ],
    },
] satisfies RouteConfig;
