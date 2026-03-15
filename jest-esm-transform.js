/**
 * Minimal Jest transformer: converts ES module syntax to CommonJS.
 * Used for client source files (.js/.jsx with `export`/`import`) so Jest can require() them.
 */
module.exports = {
    process(sourceText) {
        const exportedNames = [];

        let code = sourceText
            // import { a, b } from 'mod'  →  const { a, b } = require('mod')
            .replace(/^import\s+\{([^}]+)\}\s+from\s+(['"`][^'"`]+['"`])/mg, (_, names, mod) => {
                return `const {${names}} = require(${mod})`;
            })
            // import defaultExport from 'mod'  →  const defaultExport = require('mod').default ?? require('mod')
            .replace(/^import\s+(\w+)\s+from\s+(['"`][^'"`]+['"`])/mg, (_, name, mod) => {
                return `const ${name} = (() => { const m = require(${mod}); return m.default !== undefined ? m.default : m; })()`;
            })
            // import 'mod'  →  require('mod')
            .replace(/^import\s+(['"`][^'"`]+['"`])/mg, (_, mod) => {
                return `require(${mod})`;
            })
            // export const/let/var/function/class Name → just the declaration
            .replace(/^export\s+(const|let|var|function|class)\s+(\w+)/mg, (_, keyword, name) => {
                exportedNames.push(name);
                return `${keyword} ${name}`;
            })
            // export default → module.exports.default
            .replace(/^export\s+default\s+/mg, 'module.exports.default = ');

        if (exportedNames.length > 0) {
            code += `\nmodule.exports = { ${exportedNames.join(', ')} };`;
        }

        return { code };
    }
};
