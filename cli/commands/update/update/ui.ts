import * as p from "@clack/prompts";

/** Thin UI abstraction: interactive (@clack/prompts) vs CI (plain console) */
export function createUI(ci: boolean) {
  if (!ci) {
    return {
      intro: (msg: string) => p.intro(msg),
      outro: (msg: string) => p.outro(msg),
      note: (msg: string, title?: string) => p.note(msg, title),
      logError: (msg: string) => p.log.error(msg),
      spinnerStart: (msg: string) => {
        const s = p.spinner();
        s.start(msg);
        return s;
      },
    };
  }
  const noop = {
    start(_msg: string) {},
    stop(msg?: string) {
      if (msg) console.log(msg);
    },
    message(msg: string) {
      console.log(msg);
    },
  };
  return {
    intro: (msg: string) => console.log(msg),
    outro: (msg: string) => console.log(msg),
    note: (msg: string, _title?: string) => console.log(msg),
    logError: (msg: string) => console.error(msg),
    spinnerStart: (msg: string) => {
      console.log(msg);
      return noop;
    },
  };
}

export type UpdateUI = ReturnType<typeof createUI>;
