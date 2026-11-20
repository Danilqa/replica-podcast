// Checks the card kits served from /api/cards. Run: node api/cards/validate.mjs
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LANGUAGES = ['en', 'ru', 'uk', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'pt-BR'];
const root = dirname(fileURLToPath(import.meta.url));
const errors = [];

function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
        errors.push(`${path}: invalid JSON (${error.message})`);
        return null;
    }
}

function checkLanguages(where, data) {
    const keys = Object.keys(data ?? {});
    const missing = LANGUAGES.filter(lang => !keys.includes(lang));
    const extra = keys.filter(key => !LANGUAGES.includes(key));
    if (missing.length) errors.push(`${where}: missing languages ${missing.join(', ')}`);
    if (extra.length) errors.push(`${where}: unexpected languages ${extra.join(', ')}`);
}

function checkStrings(where, values) {
    const seen = new Set();
    values.forEach((value, index) => {
        if (typeof value !== 'string' || !value.trim()) errors.push(`${where}[${index}]: empty or not a string`);
        else if (value !== value.trim()) errors.push(`${where}[${index}]: leading or trailing whitespace`);
        else if (seen.has(value)) errors.push(`${where}[${index}]: duplicate "${value}"`);
        seen.add(value);
    });
}

const folders = readdirSync(root).filter(name => statSync(join(root, name)).isDirectory());
for (const folder of folders) {
    for (const file of readdirSync(join(root, folder)).filter(name => name.endsWith('.json'))) {
        readJson(join(root, folder, file));
    }
}

const list = readJson(join(root, 'list.json'));
if (list) {
    checkLanguages('list.json', list);
    const reference = list.en ?? [];
    const ids = reference.map(kit => kit.id);
    const missingFolders = ids.filter(id => !folders.includes(id));
    const unlistedFolders = folders.filter(folder => !ids.includes(folder));
    if (missingFolders.length) errors.push(`list.json: no folder for ${missingFolders.join(', ')}`);
    if (unlistedFolders.length) errors.push(`list.json: folders not listed ${unlistedFolders.join(', ')}`);

    for (const lang of LANGUAGES.filter(lang => Array.isArray(list[lang]))) {
        const kits = list[lang];
        if (kits.map(kit => kit.id).join() !== ids.join()) errors.push(`list.json ${lang}: ids or order differ from en`);
        kits.forEach((kit, index) => {
            const where = `list.json ${lang} ${kit.id}`;
            for (const field of ['id', 'title', 'description', 'bgColor']) {
                if (typeof kit[field] !== 'string' || !kit[field].trim()) errors.push(`${where}: empty ${field}`);
            }
            const base = reference[index] ?? {};
            for (const field of ['bgColor', 'version', 'type']) {
                if (kit[field] !== base[field]) errors.push(`${where}: ${field} differs from en`);
            }
        });
        checkStrings(`list.json ${lang} titles`, kits.map(kit => kit.title));
        checkStrings(`list.json ${lang} descriptions`, kits.map(kit => kit.description));
    }

    for (const kit of reference) {
        if (!Number.isInteger(kit.version) || kit.version < 1) {
            errors.push(`list.json ${kit.id}: version must be a positive integer`);
            continue;
        }
        const path = join(root, kit.id, `v${kit.version}.json`);
        if (!existsSync(path)) {
            errors.push(`${kit.id}/v${kit.version}.json: missing`);
            continue;
        }
        const content = readJson(path);
        if (!content) continue;
        const where = `${kit.id}/v${kit.version}.json`;
        checkLanguages(where, content);
        const counts = LANGUAGES.filter(lang => Array.isArray(content[lang])).map(lang => `${lang}=${content[lang].length}`);
        if (new Set(counts.map(count => count.split('=')[1])).size > 1) errors.push(`${where}: question counts differ (${counts.join(', ')})`);
        for (const lang of LANGUAGES) {
            if (content[lang] !== undefined && !Array.isArray(content[lang])) errors.push(`${where} ${lang}: not an array`);
            else if (content[lang]) checkStrings(`${where} ${lang}`, content[lang]);
        }
        console.log(`${where}: ${content.en?.length ?? 0} questions x ${Object.keys(content).length} languages`);
    }
}

if (errors.length) {
    console.error(`\n${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
    process.exit(1);
}
console.log(`OK: list.json and every kit's latest version have ${LANGUAGES.length} languages`);
