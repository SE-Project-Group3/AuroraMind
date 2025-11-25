// app/routes/app-layout.tsx
import { Outlet } from "react-router"; // 建议从 react-router 引入
import {
    TopNavigation,
    LeftNavigation,
} from "./navigation/navigation"; // 用相对路径更稳
import "./dashboardPage/dashboard.scss";

export default function AppLayout() {
    return (
        <div>
            <TopNavigation />
            <div className="layout">
                <LeftNavigation />
                <main className="layout-main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
