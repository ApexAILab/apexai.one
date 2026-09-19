import { SiteHeader } from "@/components/SiteHeader";
import { APP_SLOGAN } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  const [first, ...rest] = APP_SLOGAN.split(" ");

  return (
    <div className="home-page">
      <SiteHeader signedIn={Boolean(user)} />
      <main className="home-hero">
        <div className="ambient-orb" aria-hidden="true" />
        <h1>
          <span>{first}</span> {rest.slice(0, 2).join(" ")}
          <em>{rest.slice(2).join(" ")}</em>
        </h1>
      </main>
    </div>
  );
}
