import type { Route } from "./+types/profile";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Profile - AuroraMind" },
        { name: "description", content: "Profile" },
    ];
}

// loader
export async function loader({}: Route.LoaderArgs) {
    return null;
}


export default function ProfilePage() {
    return <div>Profile Page</div>;
}
