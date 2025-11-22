import Button from '@mui/material/Button'
import { FaHouse, FaLocationCrosshairs, FaListUl, FaBook, FaPenClip } from "react-icons/fa6";
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
  </menu>
}