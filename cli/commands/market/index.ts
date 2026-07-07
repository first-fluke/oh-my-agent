import type { Command } from "commander";

export function registerMarketCommand(program: Command): void {
  const market = program
    .command("market")
    .description(
      "Market research pipeline (pain / trend / competitor / discovery)",
    );

  market
    .command("detect-trap <topic>")
    .description("Preflight check that refuses keyword-trap queries")
    .option("--force", "bypass refusal even if a trap is detected")
    .action(async (topic: string, opts: { force?: boolean }) => {
      const { runDetectTrap } = await import("./detect-trap.js");
      const argv = [topic];
      if (opts.force) argv.push("--force");
      const code = await runDetectTrap(argv);
      process.exit(code);
    });

  market
    .command("discover-competitors <topic>")
    .description(
      "Auto-discover peer/competitor entities for a topic via DDG SERP entity-extract",
    )
    .option("--locale <lang>", "en|ko", "en")
    .option(
      "--limit <n>",
      "max candidate entities to return (1..25, default 20)",
    )
    .option("--timeout <sec>", "DDG fan-out timeout in seconds")
    .action(
      async (
        topic: string,
        opts: { locale?: string; limit?: string; timeout?: string },
      ) => {
        const { runDiscoverCompetitors } = await import(
          "./discover-competitors.js"
        );
        const argv: string[] = [topic];
        if (opts.locale) argv.push("--locale", opts.locale);
        if (opts.limit) argv.push("--limit", opts.limit);
        if (opts.timeout) argv.push("--timeout", opts.timeout);
        const code = await runDiscoverCompetitors(argv);
        process.exit(code);
      },
    );

  market
    .command("harvest <query>")
    .description("Fan-out harvest across community sources")
    .option("--sources <list>", "comma-separated source list")
    .option("--window <window>", "freshness window (7d|30d|90d|180d)", "30d")
    .option("--per-source-limit <n>", "items per source", "12")
    .option("--operator-pack <pack>", "pain|positive|competitor|discovery|none")
    .option("--locale <lang>", "en|ko", "en")
    .option("--cache-ttl <dur>", "cache TTL (15m, 1h, 2d)")
    .option("--no-cache", "skip cache")
    .option("--vs <entity>", "competitor entity for fan-out")
    .option("--timeout <sec>", "per-source timeout seconds")
    .option(
      "--sites <list>",
      "comma-separated site: filters for grounding (e.g., blog.naver.com,kin.naver.com)",
    )
    .option(
      "--query-strict",
      "post-filter: drop items where the query token is not present in title",
    )
    .option(
      "--no-widen",
      "disable auto-widen on thin corpus (default: widen unless --window pinned)",
    )
    .option("--widen-on-thin", "force auto-widen even when --window is pinned")
    .option(
      "--widen-threshold <n>",
      "minimum item count before auto-widen kicks in (default 5)",
    )
    .action(
      async (
        query: string,
        opts: {
          sources?: string;
          window?: string;
          perSourceLimit?: string;
          operatorPack?: string;
          locale?: string;
          cacheTtl?: string;
          cache?: boolean;
          vs?: string;
          timeout?: string;
          sites?: string;
          queryStrict?: boolean;
          widen?: boolean;
          widenOnThin?: boolean;
          widenThreshold?: string;
        },
      ) => {
        const { runHarvest } = await import("./harvest.js");
        const argv: string[] = [query];
        if (opts.sources) argv.push("--sources", opts.sources);
        if (opts.window) argv.push("--window", opts.window);
        if (opts.perSourceLimit)
          argv.push("--per-source-limit", opts.perSourceLimit);
        if (opts.operatorPack) argv.push("--operator-pack", opts.operatorPack);
        if (opts.locale) argv.push("--locale", opts.locale);
        if (opts.cacheTtl) argv.push("--cache-ttl", opts.cacheTtl);
        // Commander stores `--no-cache` as `opts.cache === false`
        if (opts.cache === false) argv.push("--no-cache");
        if (opts.vs) argv.push("--vs", opts.vs);
        if (opts.timeout) argv.push("--timeout", opts.timeout);
        if (opts.sites) argv.push("--sites", opts.sites);
        if (opts.queryStrict) argv.push("--query-strict");
        // Commander stores `--no-widen` as `opts.widen === false`
        if (opts.widen === false) argv.push("--no-widen");
        if (opts.widenOnThin) argv.push("--widen-on-thin");
        if (opts.widenThreshold)
          argv.push("--widen-threshold", opts.widenThreshold);
        const code = await runHarvest(argv);
        process.exit(code);
      },
    );

  market
    .command("score")
    .description("Score harvested items by engagement, freshness, and intent")
    .requiredOption("--intent <intent>", "pain|trend|competitor|discovery")
    .option(
      "--freshness-mode <mode>",
      "balanced_recent|strict_recent|evergreen_ok",
    )
    .option("--now-ms <ms>", "override current time (test hook)")
    .action(
      async (opts: {
        intent: string;
        freshnessMode?: string;
        nowMs?: string;
      }) => {
        const { runScore } = await import("./score.js");
        const argv: string[] = ["--intent", opts.intent];
        if (opts.freshnessMode)
          argv.push("--freshness-mode", opts.freshnessMode);
        if (opts.nowMs) argv.push("--now-ms", opts.nowMs);
        const code = await runScore(argv);
        process.exit(code);
      },
    );

  market
    .command("fuse")
    .description("URL canonicalization → weighted RRF → per-author cap → sort")
    .option("--rrf-k <n>", "RRF constant k (default 60)")
    .option("--max-per-author <n>", "max candidates per author (default 3)")
    .option(
      "--diversity-threshold <t>",
      "relevance threshold for diversity guard (guard disabled unless set)",
    )
    .action(
      async (opts: {
        rrfK?: string;
        maxPerAuthor?: string;
        diversityThreshold?: string;
      }) => {
        const { runFuse } = await import("./fuse.js");
        const argv: string[] = [];
        if (opts.rrfK) argv.push("--rrf-k", opts.rrfK);
        if (opts.maxPerAuthor) argv.push("--max-per-author", opts.maxPerAuthor);
        if (opts.diversityThreshold)
          argv.push("--diversity-threshold", opts.diversityThreshold);
        const code = await runFuse(argv);
        process.exit(code);
      },
    );

  market
    .command("cluster")
    .description(
      "Cluster candidates by entity overlap with MMR representative selection",
    )
    .option(
      "--overlap-threshold <n>",
      "overlap coefficient threshold (default 0.4)",
    )
    .option("--max-reps <n>", "max representatives per cluster (default 3)")
    .option("--lambda <n>", "MMR diversity lambda (default 0.75)")
    .action(
      async (opts: {
        overlapThreshold?: string;
        maxReps?: string;
        lambda?: string;
      }) => {
        const { runCluster } = await import("./cluster.js");
        const argv: string[] = [];
        if (opts.overlapThreshold)
          argv.push("--overlap-threshold", opts.overlapThreshold);
        if (opts.maxReps) argv.push("--max-reps", opts.maxReps);
        if (opts.lambda) argv.push("--lambda", opts.lambda);
        const code = await runCluster(argv);
        process.exit(code);
      },
    );

  market
    .command("render")
    .description("Render market research brief from cluster output")
    .option("--topic <topic>")
    .option("--intent <intent>", "pain|trend|competitor|discovery")
    .option("--format <fmt>", "md|json", "md")
    .option("--frameworks <list>", "auto|none|swot,5f,pestel", "auto")
    .option("--vs <entity>")
    .option("--min-trust <level>")
    .option("--no-self-check")
    .option("--output-dir <dir>")
    .option("--now-ms <n>", "test hook")
    .option("--version-override <ver>", "test hook")
    .action(async (opts: Record<string, unknown>) => {
      const { runRender, packArgv } = await import("./render.js");
      const code = await runRender(packArgv(opts));
      process.exit(code);
    });
}
