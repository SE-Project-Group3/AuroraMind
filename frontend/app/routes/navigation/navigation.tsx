import Button from '@mui/material/Button'
import { FaHouse, FaLocationCrosshairs, FaListUl, FaBook, FaPenClip, FaRotate, FaGear, FaRegUser } from "react-icons/fa6";
import "./navigation.scss";

export function LeftNavigation() {
  return <menu className="left-navigation">
    <Button variant="text"><FaHouse /> Dashboard </Button>
    <Button variant="text"><FaLocationCrosshairs /> Manage Goals </Button>
    <Button variant="text"><FaListUl /> To-do List </Button>
    <Button variant="text"><FaBook /> Knowledge Base </Button>
    <Button variant="text"><FaPenClip /> Summary </Button>
    </menu>
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