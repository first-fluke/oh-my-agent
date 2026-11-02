import Link from "@docusaurus/Link";
import Translate, { translate } from "@docusaurus/Translate";
import Layout from "@theme/Layout";
import marketplace from "../data/grok-bot-marketplace.json";

export default function GrokBotInstall() {
  const pluginId: unknown = marketplace.pluginId;
  const installUrl =
    typeof pluginId === "string" &&
    /^[1-9]\d*$/.test(pluginId) &&
    marketplace.verifiedAt &&
    Number.isFinite(Date.parse(marketplace.verifiedAt))
      ? `https://x.ai/bot/plugin/${pluginId}`
      : null;

  return (
    <Layout
      title={translate({
        id: "grokBot.title",
        message: "Oh My Agent for Grok Bot",
      })}
      description={translate({
        id: "grokBot.description",
        message: "Add Oh My Agent skills and specialist agents to Grok Bot.",
      })}
    >
      <main className="container margin-vert--xl">
        <h1>
          <Translate id="grokBot.title">Oh My Agent for Grok Bot</Translate>
        </h1>
        <p>
          <Translate id="grokBot.description">
            Add Oh My Agent skills and specialist agents to Grok Bot.
          </Translate>
        </p>
        {installUrl ? (
          <>
            <p>
              <Link
                className="button button--primary button--lg"
                href={installUrl}
              >
                <Translate id="grokBot.add">Add to Grok Bot</Translate>
              </Link>
            </p>
            <p>
              <Translate id="grokBot.instructions">
                Open the plugin page, choose Add to Grok Bot and follow the
                app's installation prompt. Then ask for an OMA skill by name,
                such as oma-qa.
              </Translate>
            </p>
          </>
        ) : (
          <div className="alert alert--info" role="status">
            <Translate id="grokBot.unavailable">
              Marketplace registration is pending. The install link will appear
              here after Oh My Agent is approved.
            </Translate>
          </div>
        )}
        <h2 className="margin-top--lg">
          <Translate id="grokBot.firstTask">Your first task</Translate>
        </h2>
        <blockquote>
          <Translate id="grokBot.example">
            Use oma-qa to review this repository. Report the most important
            findings with file references and explain what you verified.
          </Translate>
        </blockquote>
        <p>
          <Link to="/docs/getting-started/installation">
            <Translate id="grokBot.otherInstalls">
              Other installation methods
            </Translate>
          </Link>
        </p>
      </main>
    </Layout>
  );
}
