/**
 * Extracts docblock pragmata from a javascript file and prints as a JSON object
 */

const fs = require("fs");
const { extract, parse } = require("jest-docblock");


const code = fs.readFileSync(process.argv[2]).toString();
const pragmata = parse(extract(code));

process.stdout.write(JSON.stringify(pragmata));
