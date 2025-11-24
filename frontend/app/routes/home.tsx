import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import {LeftNavigation, TopNavigation} from "~/routes/navigation/navigation";
import "./home.scss"
import { TodoView } from "~/routes/todoPage/todolist";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return <div>
    <TopNavigation />
    <div className="layout">
      <LeftNavigation />
      <TodoView />
    </div>
    </div>;
}
