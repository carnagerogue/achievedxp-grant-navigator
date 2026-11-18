# Custom domain: grants.achievedxp.com

This change prepares the website and AI service for `https://grants.achievedxp.com`.
Do not merge the domain change until the DNS record below resolves publicly. The
current GitHub Pages address remains the production address until the migration.

## DNS host

Public DNS and registrar checks on November 6, 2026 found:

- Registrar: GoDaddy.com, LLC.
- Authoritative nameservers: `ns-cloud-c1.googledomains.com`,
  `ns-cloud-c2.googledomains.com`, `ns-cloud-c3.googledomains.com`, and
  `ns-cloud-c4.googledomains.com`.
- `grants.achievedxp.com` did not exist.

Add this record in the provider that manages that existing DNS zone. Registration
at GoDaddy does not mean GoDaddy hosts the active zone. The nameservers alone do
not establish which Google Cloud or Squarespace account controls it.

| Field | Value |
| --- | --- |
| Type | CNAME |
| Name / host | `grants` |
| Target / value | `carnagerogue.github.io` |
| TTL | Provider default |

The target contains no protocol and no repository path. In a DNS editor that
requires a fully qualified name, use `grants.achievedxp.com.`. Preserve the
existing nameservers and other website/email records.

## Publish and verify

1. Confirm the public CNAME resolves to `carnagerogue.github.io`.
2. Merge the domain change. `CNAME` is included in both the repository root for
   branch publishing and the `dist/` artifact for Actions publishing.
3. In [GitHub Pages settings](https://github.com/carnagerogue/achievedxp-grant-navigator/settings/pages),
   verify that Custom domain is `grants.achievedxp.com`. If the branch publisher
   has not applied it, enter and save that domain. Wait for the DNS check and TLS
   certificate, then enable **Enforce HTTPS** when available.
4. Sync the Render blueprint if it does not sync automatically. In the
   [AI service environment](https://dashboard.render.com/web/srv-dbml0eijnfac73apop5g/env),
   verify `GRANT_AI_ORIGIN` is `https://grants.achievedxp.com`, with no trailing
   slash or path, and deploy. Keep the existing private `GRANT_AI_KEY`. The
   backend's public URL in `config.js` stays the same.
5. Open `https://grants.achievedxp.com`, confirm HTTPS and assets, and run
   **Research my agency** from that exact origin. A successful backend health
   check alone does not verify browser CORS or OpenAI generation.

## Existing saved work

Browser storage belongs to its origin. Before the domain switch, existing users
should export their workspace backup from the GitHub Pages site. They can import
it on the new domain; saved work does not move automatically. GitHub Pages will
redirect the previous project address to the configured custom domain.

If the migration must be reversed, remove the GitHub Pages custom domain and
`CNAME`, restore Render's `GRANT_AI_ORIGIN` to `https://carnagerogue.github.io`,
and redeploy both services. Do not change the root domain's nameservers.
