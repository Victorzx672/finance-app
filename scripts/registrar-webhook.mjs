// Cadastra (uma vez) o webhook da Pluggy para o site publicado, com o segredo num cabeçalho.
// Uso: node --env-file=.env scripts/registrar-webhook.mjs https://finance-app-seven-blush.vercel.app
// Precisa de PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET e PLUGGY_WEBHOOK_SECRET (o mesmo da Vercel).

const site = process.argv[2]?.replace(/\/$/, "");
const { PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET, PLUGGY_WEBHOOK_SECRET } = process.env;

if (!site?.startsWith("https://") || !PLUGGY_CLIENT_ID || !PLUGGY_CLIENT_SECRET || !PLUGGY_WEBHOOK_SECRET) {
  console.error("Uso: node --env-file=.env scripts/registrar-webhook.mjs https://seu-site (com as 3 variáveis PLUGGY_*)");
  process.exit(1);
}

const auth = await fetch("https://api.pluggy.ai/auth", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ clientId: PLUGGY_CLIENT_ID, clientSecret: PLUGGY_CLIENT_SECRET }),
});
if (!auth.ok) throw new Error(`Pluggy /auth respondeu ${auth.status}`);
const { apiKey } = await auth.json();

const res = await fetch("https://api.pluggy.ai/webhooks", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
  body: JSON.stringify({
    url: `${site}/api/banco/webhook`,
    event: "all",
    headers: { "X-Webhook-Secret": PLUGGY_WEBHOOK_SECRET },
  }),
});

console.log(res.ok ? "Webhook cadastrado." : `Falhou: ${res.status} ${await res.text()}`);
