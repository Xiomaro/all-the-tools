/* Entry point for the Lucide icon set the Vault app uses (the same set
   Obsidian uses, so icon names in settings, callouts and themes carry over).
   Exports every icon, aliases included, as { 'kebab-name': iconNode }. */
import * as all from 'lucide';
const out = {};
for (const name of Object.keys(all)) {
  if (!Array.isArray(all[name]) || /^Lucide|Icon$/.test(name)) continue;
  const kebab = name.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2').toLowerCase();
  out[kebab] = all[name];
}
export default out;
