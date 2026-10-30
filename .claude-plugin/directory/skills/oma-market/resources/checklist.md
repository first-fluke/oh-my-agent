# oma-market checklist

- [ ] `oma market detect-trap "<topic>"` ran first; exit 2 surfaced, not bypassed
- [ ] `oma market resolve --json` is `ok`; engine version and `status` noted (`stale` → mention)
- [ ] Upstream `SKILL.md` (`engine.skillMd`) read top to bottom this run
- [ ] Upstream Step 0 (setup wizard) honoured on first run; user consent for any `.env` / Python install
- [ ] Upstream Steps 0.45 / 0.5 / 0.55 / 0.75 done when WebSearch is available, else `--auto-resolve`
- [ ] Engine ran via `oma market run … --emit=compact` in the foreground
- [ ] Intent classified; framework set matches `intent-rules.md` (or user override)
- [ ] Brief: badge first line, engine structure untouched, frameworks cite only engine clusters
- [ ] `output-laws.md` self-check clean
- [ ] Written to `.agents/results/market/{slug}-{YYYYMMDD}.md`; path + skipped sources reported
