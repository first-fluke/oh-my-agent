import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import clsx from "clsx";

import styles from "./index.module.css";

function Hero() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className={clsx("hero", styles.hero)}>
      <div className="container">
        <div className={styles.heroInner}>
          <div className={styles.logoWrapper}>
            <img
              src="icons/android/android-launchericon-192-192.png"
              alt="oh-my-agent icon"
              className={styles.logo}
              width={64}
              height={64}
            />
          </div>
          <h1 className={styles.title}>{siteConfig.title}</h1>
          <p className={styles.tagline}>{siteConfig.tagline}</p>

          <div className={styles.videoWrapper}>
            <video
              className={styles.video}
              autoPlay
              muted
              loop
              playsInline
              controls
              preload="metadata"
            >
              <source src="oh-my-ag.mp4" type="video/mp4" />
            </video>
          </div>

          <div className={styles.buttons}>
            <Link
              className="button button--primary button--lg"
              href="https://github.com/first-fluke/oh-my-agent"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </Link>
            <Link
              className="button button--secondary button--lg"
              to="/docs/getting-started/introduction"
            >
              Documentation
            </Link>
          </div>

          <p className={styles.motto}>MAKE ENGINEER GREAT AGAIN</p>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <Hero />
    </Layout>
  );
}
