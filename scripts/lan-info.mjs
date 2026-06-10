import os from "node:os";

const port = process.env.PORT || "3000";
const interfaces = os.networkInterfaces();
const urls = [];

for (const [name, entries] of Object.entries(interfaces)) {
  for (const entry of entries ?? []) {
    if (entry.family === "IPv4" && !entry.internal) {
      urls.push({ name, url: `http://${entry.address}:${port}` });
    }
  }
}

if (!urls.length) {
  console.log("Keine LAN-IP gefunden. Pruefe deine WLAN-/Ethernet-Verbindung.");
  process.exit(0);
}

console.log("Oeffne auf dem iPhone eine dieser Adressen:");
for (const item of urls) {
  console.log(`- ${item.url} (${item.name})`);
}
