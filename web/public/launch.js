(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const trainingId = params.get("training")?.trim() || "";
  const startButton = document.getElementById("startTraining");
  const status = document.getElementById("launchStatus");

  // Treat URL values as text, never HTML or authorization claims.
  document.getElementById("trainingName").textContent = params.get("title") || trainingId || "Training";
  const minutes = Number(params.get("minutes"));
  const duration = params.has("minutes") && params.get("minutes")?.trim()
    && Number.isFinite(minutes) && minutes >= 0 ? `Approx. ${minutes} min` : "Duration unavailable";
  const user = params.get("user")?.trim();
  document.getElementById("trainingMeta").textContent = user ? `Requested by ${user} · ${duration}` : duration;

  startButton.disabled = !trainingId;
  if (!trainingId) status.textContent = "No training was selected. Return to the catalog to select a training.";

  startButton.addEventListener("click", () => {
    if (!trainingId) return;
    const target = new URL("/api/launch", window.location.origin);
    target.searchParams.set("training", trainingId);
    window.location.assign(target.toString());
  });

  document.getElementById("back").addEventListener("click", () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/trainings");
  });

  const tokenNames = [
    "--brand",
    "--brand-fg",
    "--surface",
    "--text-primary",
    "--text-secondary",
    "--font-family",
    "--radius",
  ];

  async function applyTenant() {
    try {
      const response = await fetch("/tenants.json", { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error("Branding unavailable");
      const tenants = await response.json();
      if (!tenants || typeof tenants !== "object") throw new Error("Invalid branding");

      const requested = params.get("tenant") || "demo";
      const tenantId = Object.hasOwn(tenants, requested) ? requested : "demo";
      const tenant = Object.hasOwn(tenants, tenantId) ? tenants[tenantId] : null;
      // Validate the complete selected theme before applying any tokens.
      if (!tenant || typeof tenant.displayName !== "string"
        || typeof tenant.logoUrl !== "string"
        || !tenant.tokens || typeof tenant.tokens !== "object"
        || !tokenNames.every(token => typeof tenant.tokens[token] === "string")) {
        throw new Error("Invalid branding");
      }

      for (const token of tokenNames) {
        document.documentElement.style.setProperty(token, tenant.tokens[token]);
      }
      document.getElementById("tenantName").textContent = tenant.displayName;
      const logo = document.getElementById("tenantLogo");
      logo.src = tenant.logoUrl;
      logo.alt = tenant.displayName;
      document.title = `Launch Training · ${tenant.displayName}`;
      if (tenantId !== requested && trainingId) {
        status.textContent = "Hospital branding was not found. Using the demo theme.";
      }
    } catch {
      if (trainingId) status.textContent = "Hospital branding could not load. Using the demo theme.";
    }
  }

  void applyTenant();
})();
