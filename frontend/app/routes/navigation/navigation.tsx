import Button from '@mui/material/Button'
import { FaHouse, FaLocationCrosshairs, FaListUl, FaBook, FaPenClip, FaRotate, FaGear, FaRegUser, FaBars } from "react-icons/fa6";
import "./navigation.scss";
import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import { logout, getProfile } from "../../api/auth"

export function LeftNavigation() {
  const [collapsed, setCollapsed] = useState(false);

  const menu = [
    { icon: <FaHouse />, label: "Dashboard", to: "/app"},
    { icon: <FaLocationCrosshairs />, label: "Manage Goals", to: "/app/goals" },
    { icon: <FaListUl />, label: "To-do List", active: true, to: "/app/todo" },
    { icon: <FaBook />, label: "Knowledge Base", to: "/app/knowledge" },
    { icon: <FaPenClip />, label: "Summary", to: "/app/summary" },
  ];

  return (
    <aside className={`left-nav ${collapsed ? "collapsed" : ""}`}>
      <div className="top-section">
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          <FaBars />
        </button>
      </div>
      <menu className="nav-menu">
        {menu.map((m, i) => (
            //NavLink替代了button来做路由跳转
            <NavLink
                key={m.label}
                to={m.to}
                end={m.to === "/app"} // Dashboard 精确匹配 /app
                className={({ isActive }) =>
                    [
                        "nav-item",
                        isActive ? "active" : "",
                    ]
                        .filter(Boolean)
                        .join(" ")
                }
            >
                <span className="icon">{m.icon}</span>
                <span className={`label ${collapsed ? "hidden" : ""}`}>
              {m.label}
            </span>
            </NavLink>
        ))}
      </menu>
    </aside>
  );
}

export function TopNavigation() {
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    getProfile().then(res => {
      if (res.data && res.data.email) {
        setEmail(res.data.email);
      }
    });
  }, []);

  return <menu className="top-navigation">
    <span className={"title-name"}>AuroraMind</span>
    <div className="current-date"></div>
    <menu className="top-buttons">
      <Button variant={"contained"} onClick={logout}>
          <FaGear size={"1.2rem"} />
      </Button>

        <NavLink to="/app/profile" style={{ textDecoration: 'none' }}>
            <Button variant="contained">
                <FaRegUser size="1.2rem" />
            </Button>
        </NavLink>

    </menu>
    <span className={"email-address"}>{email || "未登录"}</span>
  </menu>
}