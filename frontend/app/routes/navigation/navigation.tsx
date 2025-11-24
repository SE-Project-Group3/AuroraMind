import Button from '@mui/material/Button'
import { FaHouse, FaLocationCrosshairs, FaListUl, FaBook, FaPenClip, FaRotate, FaGear, FaRegUser, FaBars } from "react-icons/fa6";
import "./navigation.scss";
import { useState } from "react";
import { NavLink } from "react-router";

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
  return <menu className="top-navigation">
    <span className={"title-name"}>AuroraMind</span>
    <div className="current-date">Placeholder for time component</div>
    <menu className="top-buttons">
      <Button variant={"contained"}><FaRotate size={"1.2rem"} /></Button>
      <Button variant={"contained"}><FaGear size={"1.2rem"} /></Button>
      <Button variant={"contained"}><FaRegUser size={"1.2rem"} /></Button>
    </menu>
    <span className={"email-address"}>sample@gmail.com</span>
  </menu>
}