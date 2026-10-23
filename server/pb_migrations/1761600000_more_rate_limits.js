/// <reference path="../pb_data/types.d.ts" />
// 23 Oct 2026: tighter per-IP limits where a request costs a D&D Beyond fetch or an email (security review):
// adding a character, or pulling a fresh copy of one, fetches the sheet from D&D Beyond, and the account endpoints
// send codes. Before, both only fell under the generous "/api/" limit (600 a minute).
migrate((app) => {
  const s = app.settings(), add = [
    { label: "characters:create", maxRequests: 20, duration: 60, audience: "" },
    { label: "characters:update", maxRequests: 60, duration: 60, audience: "" },
    { label: "/api/account/",     maxRequests: 20, duration: 60, audience: "" },
  ];
  const rules = s.rateLimits.rules.filter(r => !add.some(a => a.label === r.label));
  const at = rules.findIndex(r => r.label === "/api/");
  rules.splice(at < 0 ? rules.length : at, 0, ...add);
  s.rateLimits.rules = rules;
  app.save(s);
}, (app) => {
  const s = app.settings();
  s.rateLimits.rules = s.rateLimits.rules.filter(r => !["characters:create", "characters:update", "/api/account/"].includes(r.label));
  app.save(s);
});
