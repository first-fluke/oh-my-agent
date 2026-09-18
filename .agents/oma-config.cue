package config

// ─────────────────────────────────────────────────────────────────────────────
// Schema & Constraints
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Global preferences ───────────────────────────────────────────────────

#GlobalPreferences: {
	language:           string
	translation_voice?: "formal" | "balanced" | "interpreter"
	date_format?:       "ISO" | "US" | "EU" | string
	timezone?:          string
	auto_update_cli?:   bool
	telemetry?:         bool
}

// ── 2. Model selection & registries ─────────────────────────────────────────

#AgentSpec: {
	model:     string & =~"^[a-z0-9-]+/[a-z0-9.-]+$"
	effort?:   "none" | "low" | "medium" | "high" | "xhigh"
	thinking?: bool
	memory?:   "user" | "project" | "local"
}

#ModelSupports: {
	effort?:               null | "none" | "low" | "medium" | "high" | "xhigh" | string
	apply_patch?:          bool
	task_budget?:          bool
	prompt_cache?:         bool
	computer_use?:         bool
	native_dispatch_from?: [...string]
	api_only?:             bool
}

#ModelSpec: {
	cli:                string
	cli_model:          string
	auth_hint?:         string
	pricing_note?:      string
	subscription_tier?: string
	supports?:          #ModelSupports
}

#CustomPresetSpec: {
	extends?:        string
	description?:    string
	agent_defaults?: [string]: #AgentSpec
}

#FreeConfig: {
	base_url?:    string
	api_key_env?: string & =~"^[A-Za-z_][A-Za-z0-9_]*$"
	model?:       string
}

// ── 3. pi transport runtime ─────────────────────────────────────────────────

#PiVendorConfig: {
	command?:       string
	prompt_flag?:   string
	model_flag?:    string
	default_model?: string
	thinking_flag?: string
}

#VendorsConfig: {
	pi?: #PiVendorConfig
	[string]: _
}

// ── 4. Agent spawn budget ───────────────────────────────────────────────────

#QuotaCapConfig: {
	tokens?:      int & >=0
	spawn_count?: int & >=0
	per_vendor?: [string]: int & >=0
}

#SessionConfig: {
	quota_cap?: #QuotaCapConfig
}

// ── 5. Memory garbage collection ────────────────────────────────────────────

#MemoryGcConfig: {
	keep_sessions?: int & >=0
	max_age_days?:  int & >=0
}

#MemoryConfig: {
	gc?: #MemoryGcConfig
}

// ── 6. Serena MCP transport ─────────────────────────────────────────────────

#SerenaConfig: {
	mode?:        "bridge" | "stdio"
	auto_update?: bool
}

// ── 7. Serena memory reaper ─────────────────────────────────────────────────

#SerenaReaperConfig: {
	enabled?:      bool
	policy?:       "lru" | "idle"
	keepWarm?:     int & >=0
	idleMinutes?:  int & >=0
	graceSeconds?: int & >=0
}

// ── 8. Browser DevTools MCP ─────────────────────────────────────────────────

#McpConfig: {
	devtools_browsers?: [...("aside" | "chrome" | "firefox")]
	[string]: _
}

// ── 9. Documentation drift (oma-docs) ───────────────────────────────────────

#DocsConfig: {
	auto_verify?: bool
	check_urls?:  bool
	exclude?: [...string]
}

// ── 10. SCM & commit rules (oma-scm) ────────────────────────────────────────

#CoAuthorConfig: {
	enabled?:      bool
	name?:         string
	email?:        string
	enforce_hook?: bool
}

#ScmConfig: {
	conventional_commits?:          bool
	branching_strategy?:            string
	require_pr_for_default_branch?: bool
	co_author?:                     #CoAuthorConfig
	forbidden_patterns?: [...string]
	allowed_exceptions?: [...string]
}

// ── 11. Skill overrides ─────────────────────────────────────────────────────

#VideoProvidersConfig: {
	script?:     {order?: [...string]}
	voice?:      {order?: [...string]}
	visual?:     {order?: [...string]}
	caption?:    {order?: [...string]}
	capture?:    {order?: [...string]}
	music?:      {order?: [...string]}
	compositor?: {order?: [...string]}
	pexels?:     {env_var?: string}
	pixelle?:    {env_var?: string}
	[string]: _
}

#VideoConfig: {
	default_output_dir?:  string
	default_mode?:        "shorts" | "explainer" | "demo" | string
	default_aspect?:      string
	default_locale?:      string
	default_captions?:    string
	default_visual?:      string
	default_voice?:       string
	default_music?:       string
	default_compositor?:  string
	default_timeout_sec?: int & >=0
	yes?:                 bool
	providers?:           #VideoProvidersConfig
	cost?: {
		guardrail_usd?: number
	}
	limits?: {
		max_duration_sec?: int & >=0
		max_scenes?:       int & >=0
	}
	naming?: {
		single_folder_pattern?: string
	}
	remotion?: {
		check_interval_min?: int & >=0
	}
}

#ImageConfig: {
	default_output_dir?:  string
	default_vendor?:      "auto" | "codex" | "antigravity" | "pollinations" | string
	default_size?:        string
	default_quality?:     string
	default_count?:       int & >=1
	default_timeout_sec?: int & >=0
	vendors?: [string]: _
	cost_guardrail?: {
		estimate_threshold_usd?: number
		per_image_usd?: [string]: [string]: _
	}
	compare?: {
		folder_pattern?: string
		manifest?:       bool
	}
	naming?: {
		single_folder_pattern?: string
	}
}

#VoiceConfig: {
	notification_profile?:  null | string
	asset_profile?:         null | string
	output_dir?:            string
	auto_notify_after_sec?: null | (int & >=0)
	max_tts_chars?:         int & >=0
	max_stt_minutes?:       int & >=0
}

#HwpConfig: {
	format?: "markdown" | "json" | "chunks"
	version?: {
		channel?: "latest" | "pinned"
		pinned?:  string
	}
	output?: {
		default_location?: "same_dir" | "cwd"
	}
}

#PdfConfig: {
	format?:          "markdown"
	image_output?:    "off" | "embedded" | "external"
	image_format?:    "png" | "jpeg"
	use_struct_tree?: bool
	ocr?: {
		enabled?:     bool
		languages?:   string
		hybrid_port?: int
	}
	output?: {
		default_location?: "same_dir" | "cwd"
		overwrite?:        bool
	}
}

#ScholarConfig: {
	base_url?: string
}

#DiagramConfig: {
	engine?:          "auto" | "archify" | "mermaid"
	explain_sidecar?: bool
	archify?: {
		managed?:            bool
		channel?:            "stable" | "main"
		check_interval_min?: int & >=0
		path?:               null | string
		quality?:            "showcase" | "standard"
		open?:               bool
	}
}

#MarketConfig: {
	managed?:            bool
	channel?:            "stable" | "main"
	check_interval_min?: int & >=0
	path?:               null | string
	python?:             null | string
	save_dir?:           string
}

// ── 12. Refactor guard hook ─────────────────────────────────────────────────

#RefactorGuardConfig: {
	enabled?:   bool
	max_lines?: int & >=0
}

// ── Search & Provider overrides ─────────────────────────────────────────────

#ProvidersConfig: {
	code_intelligence?: "serena" | "gortex"
	// PreToolUse guard that denies native Grep/Glob/recursive shell search
	// while a code-intelligence provider is configured. Default: block.
	code_intelligence_guard?: "block" | "off"
	[string]: _
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-Level Unified Schema (#OmaConfig)
// ─────────────────────────────────────────────────────────────────────────────

#OmaConfig: {
	#GlobalPreferences

	// 2. Model selection
	model_preset:    "auto" | "free" | "antigravity" | "claude" | "codex" | "qwen" | "cursor" | "kiro" | "mixed" | string
	default_cli?:    string
	free?:           #FreeConfig
	agents?: [string]: #AgentSpec
	models?: [string]: #ModelSpec
	custom_presets?: [string]: #CustomPresetSpec

	// 3. pi transport runtime
	vendors?: #VendorsConfig

	// 4. Agent spawn budget
	session?: #SessionConfig

	// 5. Memory garbage collection
	memory?: #MemoryConfig

	// 6. Serena MCP transport
	serena?: #SerenaConfig

	// 7. Serena memory reaper
	serena_reaper?: #SerenaReaperConfig

	// 8. Browser DevTools MCP
	mcp?: #McpConfig

	// 9. Documentation drift
	docs?: #DocsConfig

	// 10. SCM & commit rules
	scm?: #ScmConfig

	// 11. Skill overrides
	video?:   #VideoConfig
	image?:   #ImageConfig
	voice?:   #VoiceConfig
	hwp?:     #HwpConfig
	pdf?:     #PdfConfig
	scholar?: #ScholarConfig
	diagram?: #DiagramConfig
	market?:  #MarketConfig

	// 12. Refactor guard hook
	refactor_guard?: #RefactorGuardConfig

	// Provider integrations
	providers?: #ProvidersConfig
	honcho?:    _
	brave?:     _

	// Open-ended for additional skill/hook extensions
	...
}

// ─────────────────────────────────────────────────────────────────────────────
// Project Configuration
// ─────────────────────────────────────────────────────────────────────────────

#OmaConfig & {
	// ── 1. Global preferences ──
	language:          "en"
	translation_voice: "balanced"
	date_format:       "ISO"
	timezone:          "Asia/Seoul"
	auto_update_cli:   true
	telemetry:         false

	// ── Provider integrations ──
	providers: {
		code_intelligence: "serena"
	}

	// ── 2. Model selection ──
	// Follow the current vendor's agent/model settings; explicit agents overrides win.
	model_preset: "auto"
	agents: {
		eval: {
			model: "anthropic/claude-sonnet-4-6"
		}
	}

	// ── 9. Documentation drift ──
	docs: {
		auto_verify: false
		check_urls:  true
		exclude: [
			"benchmarks/**",
			"web/i18n/**",
		]
	}

	// ── 10. SCM & commit rules ──
	scm: {
		conventional_commits:          true
		branching_strategy:            "github-flow"
		require_pr_for_default_branch: true
		co_author: {
			enabled:      true
			name:         "First Fluke"
			email:        "our.first.fluke@gmail.com"
			enforce_hook: true
		}
		forbidden_patterns: [
			"*.env",
			"*.env.*",
			"credentials.json",
			"secrets.yaml",
			"*.pem",
			"*.key",
			".env.local",
			"*.p12",
			"*.pfx",
			"id_rsa*",
			"id_ed25519*",
			".npmrc",
			"service-account*.json",
			"*.keystore",
			"*.jks",
			"*.tfvars",
			"*.tfstate",
			"*.tfstate.*",
			".netrc",
			".pypirc",
		]
		allowed_exceptions: [
			"*.example",
			"*.sample",
			"*.template",
		]
	}

	// ── Optional sections (uncomment to override defaults) ──
	//
	// free: {
	// 	base_url:    "http://127.0.0.1:31415/v1"
	// 	api_key_env: "FREELLM_API_KEY"
	// 	model:       "auto"
	// }
	//
	// session: quota_cap: {
	// 	tokens:      2000000
	// 	spawn_count: 30
	// 	per_vendor: {
	// 		claude: 1500000
	// 		codex:  500000
	// 	}
	// }
	//
	// memory: gc: {
	// 	keep_sessions: 100
	// 	max_age_days:  50
	// }
	//
	// serena: {
	// 	mode:        "bridge" // bridge | stdio
	// 	auto_update: true
	// }
	//
	// serena_reaper: {
	// 	enabled:      false
	// 	policy:       "lru" // lru | idle
	// 	keepWarm:     2
	// 	idleMinutes:  10
	// 	graceSeconds: 90
	// }
	//
	// mcp: {
	// 	devtools_browsers: ["aside"]
	// }
	//
	// refactor_guard: {
	// 	enabled:   false
	// 	max_lines: 500
	// }
}
