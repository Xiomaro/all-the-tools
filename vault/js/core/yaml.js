/* YAML for frontmatter, .base files and the like. The core schema keeps
   dates as strings (as Obsidian does) rather than turning them into Date
   objects. */
import { load as yamlLoad, dump as yamlDump, CORE_SCHEMA } from '../../../assets/vendor/js-yaml/js-yaml.mjs';

export default {
  load(text) { return yamlLoad(text, { schema: CORE_SCHEMA }); },
  dump(value) { return yamlDump(value, { schema: CORE_SCHEMA, lineWidth: -1, noRefs: true }); }
};
