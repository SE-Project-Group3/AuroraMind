// app/routes/goals.tsx
import type { Route } from "./+types/goals";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Goals - AuroraMind" },
        { name: "description", content: "Goals" },
    ];
}

// loader
export async function loader({}: Route.LoaderArgs) {
    return null;
}


export default function GoalsPage() {
    return <div>Goals Page</div>;
}
