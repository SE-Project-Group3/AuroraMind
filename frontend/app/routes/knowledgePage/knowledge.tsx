import type { Route } from "./+types/knowledge";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Knowledge - AuroraMind" },
        { name: "description", content: "Knowledge" },
    ];
}

// loader
export async function loader({}: Route.LoaderArgs) {
    return null;
}


export default function KnowledgePage() {
    return <div>Knowledge Page</div>;
}
