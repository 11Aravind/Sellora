import { parseDbError, friendlyMessage, type ActionResult } from "@/lib/errors";

export function safeAction<T, Args extends unknown[]>(
  action: (...args: Args) => Promise<T>,
  customContext?: { field?: string }
): (...args: Args) => Promise<ActionResult<T>> {
  return async (...args: Args): Promise<ActionResult<T>> => {
    try {
      const data = await action(...args);
      return { ok: true, data };
    } catch (error) {
      console.error("[safeAction error]:", error);
      const code = parseDbError(error);
      const message = friendlyMessage(code, customContext);
      return { ok: false, code, message };
    }
  };
}
