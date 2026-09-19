import Link from "next/link";
import { LogIn, UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type SiteHeaderProps = {
  signedIn: boolean;
};

export function SiteHeader({ signedIn }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="主导航">
        <Link href="/" className="brand-lockup" aria-label="APEXAI 首页">
          <BrandMark />
          <strong>APEXAI</strong>
        </Link>
        <Link href="/apexmind" className="product-link">
          ApexMind
        </Link>
      </nav>
      <div className="header-actions">
        <ThemeToggle />
        <Link
          href={signedIn ? "/account" : "/login"}
          className="icon-button"
          aria-label={signedIn ? "进入账户" : "登录"}
          title={signedIn ? "进入账户" : "登录"}
        >
          {signedIn ? <UserRound aria-hidden="true" /> : <LogIn aria-hidden="true" />}
        </Link>
      </div>
    </header>
  );
}
