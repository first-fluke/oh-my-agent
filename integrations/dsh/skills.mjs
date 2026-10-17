export function createSkillInvalidator(ctx) {
  const registrations = new Set();
  let disposed = false;
  let injected;
  let disposal;

  function register(serviceContext) {
    if (
      disposed ||
      typeof serviceContext.skills?.registerProvider !== "function"
    ) {
      return () => {};
    }
    let control;
    const unregister = serviceContext.skills.registerProvider((value) => {
      control = value;
      return {
        name: "oma-project-setup",
        async list() {
          return [];
        },
        async get() {
          return undefined;
        },
      };
    });
    const registration = { control, unregister };
    if (!control.signal.aborted) {
      registrations.add(registration);
      control.signal.addEventListener(
        "abort",
        () => {
          registrations.delete(registration);
        },
        { once: true },
      );
    }
    return unregister;
  }

  if (typeof ctx.inject === "function") {
    injected = ctx.inject(["skills"], register);
  } else {
    register(ctx);
  }

  function invalidate() {
    if (disposed) return;
    for (const { control } of registrations) {
      if (!control.signal.aborted) control.invalidate();
    }
  }

  function dispose() {
    if (disposal) return disposal;
    disposed = true;
    disposal = (async () => {
      await injected?.dispose?.();
      await Promise.all(
        [...registrations].map(({ unregister }) => unregister()),
      );
      registrations.clear();
    })();
    return disposal;
  }

  return { invalidate, dispose };
}
