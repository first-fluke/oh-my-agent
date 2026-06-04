import type { VideoConfig } from "./config.js";
import { ProviderUnavailableError } from "./errors.js";
import { TimedCaptionProvider } from "./providers/caption.js";
import { GuidedCaptureProvider } from "./providers/capture.js";
import { PlaywrightCaptureProvider } from "./providers/capture-playwright.js";
import { RemotionLikeCompositor } from "./providers/compositor.js";
import {
  AgentScriptProvider,
  type ScriptInjector,
} from "./providers/script.js";
import { PixelleVisualProvider } from "./providers/visual-aigc.js";
import { OmaImageVisualProvider } from "./providers/visual-image.js";
import { OmaSlideVisualProvider } from "./providers/visual-slide.js";
import { PexelsVisualProvider } from "./providers/visual-stock.js";
import { VoiceboxVoiceProvider } from "./providers/voice.js";
import type {
  Availability,
  Capability,
  CapabilityProvider,
} from "./providers.js";

interface RegistryEntry {
  capability: Capability;
  provider: CapabilityProvider;
}

export class VideoProviderRegistry {
  private entries: RegistryEntry[] = [];

  register(capability: Capability, provider: CapabilityProvider): this {
    this.entries.push({ capability, provider });
    return this;
  }

  list(capability?: Capability): RegistryEntry[] {
    return this.entries.filter((entry) =>
      capability ? entry.capability === capability : true,
    );
  }

  resolve(capability: Capability, order: string[]): CapabilityProvider[] {
    const entries = this.list(capability);
    const byId = new Map(entries.map((entry) => [entry.provider.id, entry]));
    const resolved = order
      .map((id) => byId.get(id)?.provider)
      .filter((provider): provider is CapabilityProvider => Boolean(provider));
    if (resolved.length === 0) {
      throw new ProviderUnavailableError(
        `No ${capability} providers registered for order: ${order.join(", ")}`,
      );
    }
    return resolved;
  }

  async availability(): Promise<
    Array<{ capability: Capability; id: string; availability: Availability }>
  > {
    return Promise.all(
      this.entries.map(async (entry) => ({
        capability: entry.capability,
        id: entry.provider.id,
        availability: await entry.provider.available().catch((err) => ({
          ok: false,
          reason: (err as Error).message,
        })),
      })),
    );
  }
}

export interface DefaultRegistryOptions {
  /** Optional agent-authored script injector (agent-as-key). */
  scriptInjector?: ScriptInjector;
  /** $PWD used by the capture provider for path-guarding (defaults to cwd). */
  cwd?: string;
}

export function defaultVideoRegistry(
  config: VideoConfig,
  options: DefaultRegistryOptions = {},
): VideoProviderRegistry {
  const registry = new VideoProviderRegistry();
  void config; // env-gated availability lives in each provider, not config flags.
  registry
    .register("script", new AgentScriptProvider(options.scriptInjector))
    .register("voice", new VoiceboxVoiceProvider())
    .register("visual", new OmaImageVisualProvider())
    .register("visual", new OmaSlideVisualProvider())
    .register("visual", new PexelsVisualProvider())
    .register("visual", new PixelleVisualProvider())
    .register("caption", new TimedCaptionProvider())
    .register("capture", new PlaywrightCaptureProvider(options.cwd))
    .register("capture", new GuidedCaptureProvider(options.cwd))
    .register("compositor", new RemotionLikeCompositor("remotion"))
    .register("compositor", new RemotionLikeCompositor("mpt"));
  return registry;
}
