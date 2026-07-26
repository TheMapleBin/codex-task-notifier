// The actual OpenClaw transport is deliberately not guessed. Different OpenClaw
// deployments expose different Gateway/CLI contracts and recipient identifiers.
// This adapter becomes active only after the user supplies that contract.
export function createOpenClawAdapter() {
  return Object.freeze({
    name: "openclaw",
    async send() {
      throw new Error("OpenClaw delivery is not configured. Supply the verified Gateway or CLI contract first.");
    }
  });
}
