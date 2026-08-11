#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";

const previewPath = process.argv[2];

if (!previewPath) {
  console.error("Usage: node scripts/validate-preview.mjs <preview.html>");
  process.exit(1);
}

const absolutePreviewPath = path.resolve(previewPath);
const html = fs.readFileSync(absolutePreviewPath, "utf8");
const errors = [];

function fail(message) {
  errors.push(message);
}

function count(text, pattern) {
  return text.split(pattern).length - 1;
}

const startMarker = "/* PREVIEW_DATA_START */";
const endMarker = "/* PREVIEW_DATA_END */";

if (count(html, startMarker) !== 1 || count(html, endMarker) !== 1) {
  fail("preview.html must contain exactly one PREVIEW_DATA block");
}

if (html.includes("CANDIDATE_STYLES") || html.includes("CANDIDATE_SWITCHER")) {
  fail("candidate styles and switcher must come from PREVIEW_DATA only");
}

const dataStart = html.indexOf(startMarker) + startMarker.length;
const dataEnd = html.indexOf(endMarker);
let themes = {};

if (dataStart >= startMarker.length && dataEnd > dataStart) {
  try {
    const dataSource = html.slice(dataStart, dataEnd);
    themes = vm.runInNewContext(`${dataSource}\nthemes`, Object.create(null), {
      timeout: 1000,
    });
  } catch (error) {
    fail(`PREVIEW_DATA is not valid JavaScript: ${error.message}`);
  }
}

const themeEntries = Object.entries(themes || {});
if (themeEntries.length < 1 || themeEntries.length > 3) {
  fail("PREVIEW_DATA must define one to three candidates");
}

const requiredBaseKeys = [
  "--white",
  "--black",
  "--snow",
  "--eclipse",
  "--border-width",
  "--field-border-width",
  "--radius",
  "--field-radius",
  "--opacity-disabled",
  "--theme",
];

const requiredPreviewKeys = [
  "--secondary",
  "--control-height",
  "--space",
  "--header-background",
  "--header-foreground",
  "--export-background",
  "--export-foreground",
  "--tab-active",
  "--tab-active-foreground",
  "--hero-shape-width",
  "--hero-shape-height",
  "--hero-shape-top",
  "--hero-shape-right",
  "--hero-shape-radius",
  "--hero-shape-background",
  "--feature-background",
  "--feature-foreground",
  "--pattern-background",
];

function findHeroVariables(startPath) {
  let directory = path.dirname(startPath);
  while (true) {
    const candidate = path.join(
      directory,
      "apps/mobile/node_modules/heroui-native/src/styles/variables.css",
    );
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

function readVariantKeys(css, variant) {
  const match = css.match(new RegExp(`@variant\\s+${variant}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`));
  if (!match) return [];
  return [...match[1].matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((item) => item[1]);
}

const variablesPath = findHeroVariables(absolutePreviewPath) || findHeroVariables(import.meta.filename);
let requiredSemanticKeys = [];

if (variablesPath) {
  const variablesCss = fs.readFileSync(variablesPath, "utf8");
  requiredSemanticKeys = [...new Set([
    ...readVariantKeys(variablesCss, "light"),
    ...readVariantKeys(variablesCss, "dark"),
  ])].sort();
} else {
  requiredSemanticKeys = [
    "--background",
    "--foreground",
    "--surface",
    "--surface-foreground",
    "--accent",
    "--accent-foreground",
    "--success",
    "--success-foreground",
    "--warning",
    "--warning-foreground",
    "--danger",
    "--danger-foreground",
  ];
}

function sortedKeys(value) {
  return Object.keys(value || {}).sort();
}

function sameKeys(left, right) {
  return JSON.stringify(sortedKeys(left)) === JSON.stringify(sortedKeys(right));
}

let referenceBase = null;
let referenceLight = null;
let referencePreview = null;

for (const [themeId, theme] of themeEntries) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(themeId)) {
    fail(`${themeId}: candidate id must use lowercase kebab-case`);
  }
  if (!theme || typeof theme !== "object") {
    fail(`${themeId}: candidate must be an object`);
    continue;
  }
  if (typeof theme.name !== "string" || !theme.name.trim()) fail(`${themeId}: name is required`);
  if (typeof theme.label !== "string" || !theme.label.trim()) fail(`${themeId}: label is required`);
  if (!Array.isArray(theme.swatches) || theme.swatches.length < 3) fail(`${themeId}: add at least three swatches`);
  for (const group of ["preview", "base", "light", "dark"]) {
    if (!theme[group] || typeof theme[group] !== "object" || Array.isArray(theme[group])) {
      fail(`${themeId}: ${group} must be an object`);
    }
  }
  for (const forbiddenKey of ["headline", "featureCopy", "mark", "copy"]) {
    if (Object.hasOwn(theme, forbiddenKey)) {
      fail(`${themeId}: ${forbiddenKey} must stay shared across candidates`);
    }
  }
  if (!sameKeys(theme.light, theme.dark)) {
    fail(`${themeId}: Light and Dark semantic keys differ`);
  }
  for (const key of requiredBaseKeys) {
    if (!Object.hasOwn(theme.base || {}, key)) fail(`${themeId}: base is missing ${key}`);
  }
  for (const key of requiredPreviewKeys) {
    if (!Object.hasOwn(theme.preview || {}, key)) fail(`${themeId}: preview is missing ${key}`);
  }
  for (const key of requiredSemanticKeys) {
    if (!Object.hasOwn(theme.light || {}, key)) fail(`${themeId}: Light is missing ${key}`);
    if (!Object.hasOwn(theme.dark || {}, key)) fail(`${themeId}: Dark is missing ${key}`);
  }
  if (referenceBase && !sameKeys(referenceBase, theme.base)) fail(`${themeId}: base keys differ from the first candidate`);
  if (referenceLight && !sameKeys(referenceLight, theme.light)) fail(`${themeId}: semantic keys differ from the first candidate`);
  if (referencePreview && !sameKeys(referencePreview, theme.preview)) fail(`${themeId}: preview keys differ from the first candidate`);
  referenceBase ||= theme.base;
  referenceLight ||= theme.light;
  referencePreview ||= theme.preview;
}

const htmlWithoutData = `${html.slice(0, dataStart)}${html.slice(dataEnd)}`;
if (/:root\s*\[data-theme\s*=/.test(htmlWithoutData)) {
  fail("candidate-specific CSS selectors are not allowed outside PREVIEW_DATA");
}

for (const tab of ["Overview", "Components", "Patterns"]) {
  if (count(html, `>${tab}</button>`) !== 1) fail(`missing or repeated ${tab} tab`);
}

if (errors.length) {
  console.error(`Preview validation failed (${errors.length}):`);
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

const source = variablesPath ? path.relative(process.cwd(), variablesPath) : "built-in fallback";
console.log(`Preview is valid: ${themeEntries.length} candidate(s), ${requiredSemanticKeys.length} semantic keys (${source})`);
