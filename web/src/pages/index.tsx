import Link from "@docusaurus/Link";
import Translate, { translate } from "@docusaurus/Translate";
import useBaseUrl from "@docusaurus/useBaseUrl";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import clsx from "clsx";

import styles from "./index.module.css";

function Hero() {
  const { siteConfig } = useDocusaurusContext();
  const logoSrc = useBaseUrl("/icons/android/android-launchericon-192-192.png");

  return (
    <header className={clsx("hero", styles.hero)}>
      <div className="container">
        <div className={styles.heroInner}>
          <div className={styles.logoWrapper}>
            <img
              src={logoSrc}
              alt=""
              className={styles.logo}
              width={64}
              height={64}
            />
          </div>
          <h1 className={styles.title}>{siteConfig.title}</h1>
          <p className={styles.tagline}>
            <Translate id="homepage.hero.description">
              Use your coding agent to review a diff, diagnose a failing test,
              or design an admin UI.
            </Translate>
          </p>
          <div className={styles.buttons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/tasks/review-ai-code"
            >
              <Translate id="homepage.hero.review">
                Review AI-written code
              </Translate>
            </Link>
            <Link
              className="button button--secondary button--lg"
              to="/docs/getting-started/installation"
            >
              <Translate id="homepage.hero.install">Install OMA</Translate>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function TaskEntries() {
  return (
    <section className={styles.taskSection} aria-labelledby="task-heading">
      <div className="container">
        <h2 id="task-heading">
          <Translate id="homepage.tasks.title">Choose a task</Translate>
        </h2>
        <p className={styles.sectionDescription}>
          <Translate id="homepage.tasks.description">
            Start with a bounded task in a repository you know.
          </Translate>
        </p>
        <ul className={styles.taskGrid}>
          <li>
            <Link className={styles.taskCard} to="/docs/tasks/review-ai-code">
              <span className={styles.taskTitle}>
                <Translate id="homepage.tasks.review.title">
                  Review AI-written code
                </Translate>
              </span>
              <span className={styles.taskDescription}>
                <Translate id="homepage.tasks.review.description">
                  Check a diff for correctness, security, and missing tests. Tie
                  each finding to a file and line.
                </Translate>
              </span>
              <span className={styles.taskAction} aria-hidden="true">
                <Translate id="homepage.tasks.openGuide">Open guide</Translate>
                {" →"}
              </span>
            </Link>
          </li>
          <li>
            <Link
              className={styles.taskCard}
              to="/docs/tasks/debug-failing-tests"
            >
              <span className={styles.taskTitle}>
                <Translate id="homepage.tasks.debug.title">
                  Diagnose a failing test
                </Translate>
              </span>
              <span className={styles.taskDescription}>
                <Translate id="homepage.tasks.debug.description">
                  Reproduce a failing command, isolate its cause, and verify a
                  focused fix.
                </Translate>
              </span>
              <span className={styles.taskAction} aria-hidden="true">
                <Translate id="homepage.tasks.openGuide">Open guide</Translate>
                {" →"}
              </span>
            </Link>
          </li>
          <li>
            <Link className={styles.taskCard} to="/docs/tasks/design-admin-ui">
              <span className={styles.taskTitle}>
                <Translate id="homepage.tasks.design.title">
                  Design an admin UI
                </Translate>
              </span>
              <span className={styles.taskDescription}>
                <Translate id="homepage.tasks.design.description">
                  Plan tables, filters, forms, and loading, empty, and error
                  states for an internal tool.
                </Translate>
              </span>
              <span className={styles.taskAction} aria-hidden="true">
                <Translate id="homepage.tasks.openGuide">Open guide</Translate>
                {" →"}
              </span>
            </Link>
          </li>
        </ul>
        <aside className={styles.caseStudy} aria-labelledby="case-heading">
          <div>
            <h3 id="case-heading">
              <Translate id="homepage.case.title">
                A repair from this repo
              </Translate>
            </h3>
            <p>
              <Translate id="homepage.case.description">
                Follow a plugin-hook repair from the failing behavior to the
                focused tests and their verification limits.
              </Translate>
            </p>
          </div>
          <Link
            className={styles.caseLink}
            to="/docs/examples/plugin-hook-repair"
          >
            <Translate id="homepage.case.link">Read the repair case</Translate>
            {" →"}
          </Link>
        </aside>
      </div>
    </section>
  );
}

function Walkthrough() {
  const videoSrc = useBaseUrl("/oh-my-ag.mp4");

  return (
    <section
      className={styles.walkthrough}
      aria-labelledby="walkthrough-heading"
    >
      <div className="container">
        <div className={styles.walkthroughInner}>
          <h2 id="walkthrough-heading">
            <Translate id="homepage.walkthrough.title">
              Watch the walkthrough
            </Translate>
          </h2>
          <div className={styles.videoWrapper}>
            <video
              className={styles.video}
              autoPlay
              muted
              loop
              playsInline
              controls
              preload="metadata"
              aria-label={translate({
                id: "homepage.walkthrough.videoLabel",
                message: "oh-my-agent walkthrough",
              })}
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
          </div>
          <nav
            className={styles.buttons}
            aria-label={translate({
              id: "homepage.resources.label",
              message: "More resources",
            })}
          >
            <Link
              className="button button--secondary"
              to="/docs/getting-started/introduction"
            >
              <Translate id="homepage.resources.getStarted">
                Getting started
              </Translate>
            </Link>
            <Link
              className="button button--secondary"
              href="https://github.com/first-fluke/oh-my-agent"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </Link>
          </nav>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Layout
      title={translate({
        id: "homepage.meta.title",
        message: "Agent skills for code reviews, debugging, and admin UI",
      })}
      description={translate({
        id: "homepage.meta.description",
        message:
          "Use OMA skills with your coding agent. Start with a code review, a failing test, or an admin UI task, and inspect a real repair case.",
      })}
    >
      <Hero />
      <main>
        <TaskEntries />
        <Walkthrough />
      </main>
    </Layout>
  );
}
