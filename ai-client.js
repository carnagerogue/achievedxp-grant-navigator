/* Site-owned AI transport. Provider credentials never enter the browser. */
window.GrantAI = (() => {
  const unavailable =
    "AI is not available right now. Your work is saved; please try again later.";
  function endpoint() {
    const raw = window.NAV_CONFIG?.aiBaseUrl || "";
    if (!raw) return "";
    try {
      const url = new URL(raw);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      )
        return null;
      return url.origin + url.pathname.replace(/\/$/, "");
    } catch (_) {
      return null;
    }
  }
  function enabled() {
    const mode = window.NAV_CONFIG?.aiAuthMode;
    return (
      window.NAV_CONFIG?.aiEnabled === true &&
      endpoint() !== null &&
      (mode === "site" || (mode === "local_session" && !endpoint()))
    );
  }
  async function request(body, { signal = AbortSignal.timeout(90000) } = {}) {
    if (!enabled()) throw new Error(unavailable);
    let response;
    try {
      response = await fetch(endpoint() + "/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: endpoint() ? "omit" : "same-origin",
        cache: "no-store",
        signal,
      });
    } catch (error) {
      if (error.name === "TimeoutError" || error.name === "AbortError")
        throw error;
      throw new Error(unavailable);
    }
    let result;
    try {
      result = await response.json();
    } catch (_) {
      throw new Error(unavailable);
    }
    if (!response.ok) throw new Error(result.error || unavailable);
    return result;
  }
  return { enabled, request, unavailable };
})();
