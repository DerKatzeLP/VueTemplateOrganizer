import render from "dom-serializer"
import { readFileSync } from "fs"
import fsp from "fs/promises"
import * as htmlparser2 from "htmlparser2"
import { DomHandler } from "htmlparser2"
import path from "path"

// Constants
const QUOTE_REGEX = /&quot;/g
const SLOT_REGEX = /temp-slot="([^"]*)"/g
const V_SLOT_REGEX = /temp-v-slot="([^"]*)"/g
const TEMPLATE_TAG_START = "<template>"
const TEMPLATE_TAG_END = "</template>"
const VUE_FILE_EXTENSION = ".vue"
const NODE_TYPE_ELEMENT = 1

// File paths
const SORTING_FILES = ["sorting.tmporg.json", "sorting.json"]
const CONFIG_FILES = ["config.tmporg.json", "config.json"]

// Colors for console output
const COLORS = {
  RED: "\x1b[31m",
  YELLOW: "\x1b[33m",
  WHITE_BG_RED: "\x1b[47m\x1b[31m",
  RESET: "\x1b[0m",
}

// Navigate to the root directory of the project
let projectRoot = process.cwd().split("node_modules")[0]
if (projectRoot.endsWith("/")) {
  projectRoot = projectRoot.slice(0, -1) + config.vueFolderPath.toString()
}

// Get grouping settings
let elementAttributeSorting = null
try {
  elementAttributeSorting = JSON.parse(
    readFileSync(projectRoot + "/sorting.tmporg.json")
  )
} catch {
  try {
    elementAttributeSorting = JSON.parse(readFileSync("./sorting.json"))
  } catch {
    console.log(
      "\x1b[47m\x1b[31m# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #"
    )
    console.error(
      "# Could not load grouping file.                             #"
    )
    console.error(
      "# Please add a valid grouping.tmporg.json                   #"
    )
    console.log("# Add the file to your root folder: ./sorting.tmporg.json  #")
    console.log(
      "# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #\x1b[0m"
    )
    process.exit(0)
  }
}

// Get config
let config = null
try {
  config = JSON.parse(readFileSync(projectRoot + "/config.tmporg.json"))
} catch {
  try {
    config = JSON.parse(readFileSync("./config.json"))
  } catch {
    console.log(
      "\x1b[47m\x1b[31m# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #"
    )
    console.error("# Could not load config file.                             #")
    console.error("# Please add a valid config.tmporg.json                   #")
    console.log("# Add the file to your root folder: ./config.tmporg.json  #")
    console.log(
      "# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #\x1b[0m"
    )
    process.exit(0)
  }
}

/**
 * Get the project root directory
 */
function getProjectRoot() {
  let root = process.cwd().split("node_modules")[0]
  return root.endsWith("/") ? root.slice(0, -1) : root
}

/**
 * Load configuration files with fallback mechanism
 */
async function loadConfigFile(fileNames, configType) {
  const files = fileNames.map((name) => `${projectRoot}/${name}`)

  for (const [idx, file] of files.entries()) {
    try {
      return JSON.parse(await fsp.readFile(file))
    } catch (err) {
      if (idx === 0) {
        logConfigError(configType, fileNames[0])
      }
    }
  }

  throw new Error(
    `Could not load ${configType} file. Please add a valid ${fileNames[0]}`
  )
}

/**
 * Log configuration error with formatted output
 */
function logConfigError(configType, fileName) {
  const border = "# # # # # # # # # # # # # # # # # # # # # # # # # # # # # #"
  console.log(`${COLORS.WHITE_BG_RED}${border}`)
  console.error(
    `# Could not load ${configType} file.${" ".repeat(
      Math.max(0, 35 - configType.length)
    )}#`
  )
  console.error(
    `# Trying to use fallback ${fileName.split(".")[0]}.json${" ".repeat(
      Math.max(0, 28 - fileName.split(".")[0].length)
    )}#`
  )
  console.error(
    `# Please add a valid ${fileName}${" ".repeat(
      Math.max(0, 37 - fileName.length)
    )}#`
  )
  console.log(
    `# Add the file to your root folder: ./${fileName}${" ".repeat(
      Math.max(0, 20 - fileName.length)
    )}#`
  )
  console.log(`${border}${COLORS.RESET}`)
  console.log("")
}

/**
 * Parse HTML template with specific options
 */
function parseTemplate(template) {
  const handler = new DomHandler()
  const parser = new htmlparser2.Parser(handler, {
    lowerCaseTags: false,
    lowerCaseAttributeNames: false,
    recognizeSelfClosing: true,
    decodeEntities: false,
  })

  parser.write(template)
  parser.end()

  return handler.dom
}

/**
 * Get attribute sort priority
 */
function getAttributeSortPriority(attributeName) {
  const index = elementAttributeSorting.indexOf(attributeName)
  return index === -1 ? Infinity : index
}

/**
 * Sort attributes according to configuration
 */
function sortNodeAttributes(node) {
  if (node.nodeType !== NODE_TYPE_ELEMENT) return

  const sortedAttributes = Object.keys(node.attribs)
    .map((key) => ({ name: key, value: node.attribs[key] }))
    .sort((a, b) => {
      const priorityA = getAttributeSortPriority(a.name)
      const priorityB = getAttributeSortPriority(b.name)
      return priorityA - priorityB
    })

  node.attribs = {}
  sortedAttributes.forEach(({ name, value }) => {
    processAttribute(node, name, value)
  })

  // Recursively sort child nodes
  if (node.children) {
    node.children.forEach(sortNodeAttributes)
  }
}

/**
 * Process individual attribute based on Vue-specific syntax
 */
function processAttribute(node, name, value) {
  if (name.startsWith("@")) {
    node.attribs[name.replace(/^[@:]/, "v-on:")] = value
  } else if (name.startsWith("v-slot:")) {
    node.attribs["temp-v-slot"] =
      name.replace("v-slot:", "") + (value ? `="${value}"` : "")
  } else if (name.startsWith("v-slot=")) {
    node.attribs["temp-v-slot"] =
      name.replace("v-slot=", "") + (value ? `="${value}"` : "")
  } else if (name.startsWith("#")) {
    node.attribs["temp-slot"] = name.slice(1) + (value ? `="${value}"` : "")
  } else {
    node.attribs[name] = value
  }
}

/**
 * Apply post-processing replacements
 */
function applyPostProcessing(template) {
  return template
    .replace(/v-on:/g, "@")
    .replace(SLOT_REGEX, (_match, p1) => `#${p1}`)
    .replace(V_SLOT_REGEX, (_match, p1) => `v-slot:${p1}`)
    .replace(QUOTE_REGEX, '"')
}

/**
 * Sort element attributes in template
 */
export function sortElementAttributes(template) {
  if (!config.sortVueFiles) return template

  const dom = parseTemplate(template)
  dom.forEach(sortNodeAttributes)

  const templateResult = render(dom, {
    selfClosingTags: true,
    emptyAttrs: false,
    encodeEntities: false,
    decodeEntities: false,
  })

  return applyPostProcessing(templateResult)
}

/**
 * Extract template content from Vue SFC
 */
function extractTemplateContent(htmlContent) {
  const templateStart = htmlContent.search(TEMPLATE_TAG_START)
  const templateEnd = htmlContent.lastIndexOf(TEMPLATE_TAG_END)

  if (templateStart === -1 || templateEnd === -1) {
    return null
  }

  const contentStart = templateStart + TEMPLATE_TAG_START.length
  return {
    content: htmlContent.substring(contentStart, templateEnd),
    start: contentStart,
    end: templateEnd,
  }
}

/**
 * Replace template content in Vue SFC
 */
async function replaceTemplateInVueSFC(filePath, vueFileName = "xyz.vue") {
  try {
    let htmlContent = await fsp.readFile(filePath, "utf-8")
    const templateInfo = extractTemplateContent(htmlContent)

    if (!templateInfo) {
      console.error(
        `${COLORS.RED}The template content of ${vueFileName} was not found.${COLORS.RESET}`
      )
      return
    }

    const sortedTemplateContent = sortElementAttributes(templateInfo.content)

    htmlContent =
      htmlContent.substring(0, templateInfo.start) +
      sortedTemplateContent +
      htmlContent.substring(templateInfo.end)

    await fsp.writeFile(filePath, htmlContent, "utf-8")

    if (config.showLogFiles) {
      console.log(
        `--> File ${COLORS.YELLOW}${vueFileName}${COLORS.RESET} has been edited`
      )
    }
  } catch (error) {
    console.error(`Error updating the file ${vueFileName}:`, error.message)
  }
}

/**
 * Process Vue files in a directory
 */
async function processVueFilesInDirectory(folderPath) {
  try {
    const fileNames = await fsp.readdir(folderPath)
    const vueFiles = fileNames.filter(
      (fileName) => path.extname(fileName) === VUE_FILE_EXTENSION
    )

    // Process Vue files
    for (const vueFile of vueFiles) {
      const filePath = path.join(folderPath, vueFile)
      await replaceTemplateInVueSFC(filePath, vueFile)
    }

    return fileNames
  } catch (error) {
    console.error(
      `${COLORS.RED}Error processing Vue files:${COLORS.RESET}`,
      error.message
    )
    return []
  }
}

/**
 * Process subdirectories recursively
 */
async function processSubdirectories(folderPath, fileNames) {
  for (const fileName of fileNames) {
    const filePath = path.join(folderPath, fileName)

    try {
      const stats = await fsp.stat(filePath)
      if (stats.isDirectory()) {
        await processAllVueFiles(filePath)
      }
    } catch (error) {
      console.error(`Error processing subdirectory ${fileName}:`, error.message)
    }
  }
}

/**
 * Process all Vue files in folder and subfolders
 */
export async function processAllVueFiles(folderPath) {
  const fileNames = await processVueFilesInDirectory(folderPath)
  await processSubdirectories(folderPath, fileNames)

  if (config.showLogFolders) {
    console.log(
      `====> Folder ${COLORS.YELLOW}${folderPath}${COLORS.RESET} has been processed.`
    )
    console.log(
      `- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - `
    )
  }
}

// Start processing Vue files in the current directory
console.log("\x1b[33mPath to project root\x1b[0m", projectRoot)
await processAllVueFiles(projectRoot)
