/**
 * Repara EJS donde Prettier rompió etiquetas <%=...%> en múltiples líneas.
 * Une la línea actual con las siguientes hasta completar el tag EJS o el atributo HTML.
 */
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const rawFilePath = process.argv[2];
if (!rawFilePath) {
    console.error('Falta ruta de archivo');
    process.exit(1);
}

const rootDir = path.resolve(process.cwd());
const filePath = path.resolve(rootDir, rawFilePath);

// Validar que la ruta resuelta permanezca dentro del directorio raíz del proyecto (previene Path Injection S8707)
if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath)) {
    console.error('Acceso denegado o archivo no encontrado:', rawFilePath);
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
// Normalizar a \r\n para Windows
const lines = content.split(/\r?\n/);
const result = [];

let i = 0;
while (i < lines.length) {
    let line = lines[i];

    // Contar cuántos <% abren y %> cierran en la línea
    const opens = (line.match(/<%/g) || []).length;
    const closes = (line.match(/%>/g) || []).length;

    // Si hay más aperturas que cierres, unir con líneas siguientes
    if (opens > closes) {
        while (i + 1 < lines.length) {
            i++;
            const next = lines[i];
            line = line.trimEnd() + ' ' + next.trimStart();
            const o = (line.match(/<%/g) || []).length;
            const c = (line.match(/%>/g) || []).length;
            if (o <= c) break;
        }
    }

    result.push(line);
    i++;
}

const fixed = result.join('\r\n');
fs.writeFileSync(filePath, fixed, 'utf8');
console.log(`Escrito: ${filePath}`);

// Verificar
try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    // Script utilitario de desarrollo ejecutado localmente para validar la sintaxis de plantillas EJS
    ejs.compile(fileContent, { filename: filePath }); // NOSONAR
    console.log('EJS compile: OK ✓');
} catch (e) {
    console.log('EJS compile ERROR:', e.message.substring(0, 200));
}
