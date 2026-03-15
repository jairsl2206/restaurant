/**
 * Minimal Jest transformer: converts ES module exports to CommonJS.
 * Used for client source files (.js with `export`) so Jest can require() them.
 */
module.exports = {
    process(sourceText) {
        const exportedNames = [];

        let code = sourceText
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
