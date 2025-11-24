import type { Route } from "./+types/summary";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Summary - AuroraMind" },
        { name: "description", content: "Summary" },
    ];
}

// loader
export async function loader({}: Route.LoaderArgs) {
    return null;
}


export default function SummaryPage() {
    return <div>Summary Page</div>;
}
