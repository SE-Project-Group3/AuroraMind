import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import {LeftNavigation, TopNavigation} from "~/routes/navigation/navigation";
import "./home.scss"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return <body>
    <TopNavigation />
    <div>
      <LeftNavigation />
    </div>
    </body>;
}
