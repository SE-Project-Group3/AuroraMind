import type { Route } from "./+types/dashboard";
import "./dashboard.scss"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Dashboard() {
  return <div>
    <div className="layout">
    </div>
      <h1>I'm home</h1>
    </div>;
}
