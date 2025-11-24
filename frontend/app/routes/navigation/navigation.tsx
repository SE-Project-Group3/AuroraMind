import Button from '@mui/material/Button'
import { FaHouse, FaLocationCrosshairs, FaListUl, FaBook, FaPenClip, FaRotate, FaGear, FaRegUser, FaBars } from "react-icons/fa6";
import "./navigation.scss";
import { useState } from "react";

export function LeftNavigation() {
  const [collapsed, setCollapsed] = useState(false);

  const menu = [
    { icon: <FaHouse />, label: "Dashboard" },
    { icon: <FaLocationCrosshairs />, label: "Manage Goals" },
    { icon: <FaListUl />, label: "To-do List", active: true },
    { icon: <FaBook />, label: "Knowledge Base" },
    { icon: <FaPenClip />, label: "Summary" },
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
          <button key={i} className={`nav-item ${m.active ? "active" : ""}`}>
            <span className="icon">{m.icon}</span>
            <span className={`label ${collapsed ? "hidden" : ""}`}>{m.label}</span>
          </button>
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