import render from "dom-serializer"
import fsp from "fs/promises"
import * as htmlparser2 from "htmlparser2"
import { DomHandler } from "htmlparser2"
import path from "path"

const QUOTE_REGEX = /&quot;/g
const SLOT_REGEX = /temp-slot="([^"]*)"/g

// Navigate to the root directory of the project
let projectRoot = process.cwd().split("node_modules")[0]
if (projectRoot.endsWith("/")) {
  projectRoot = projectRoot.slice(0, -1)
}

// Load sorting settings
async function loadSortingSettings() {
  const files = [`${projectRoot}/sorting.tmporg.json`, "sorting.json"]

  for (const [idx, file] of files.entries()) {
    try {
      return JSON.parse(await fsp.readFile(file))
    } catch (err) {
      if (idx === 0) {
        console.log(
          "\x1b[47m\x1b[31m# # # # # # # # # # # # # # # # # # # # # # # # # # # # # #"
        )
        console.error(
          "# Could not load sorting file.                            #"
        )
        console.error(
          "# Trying to use fallback sorting.json                     #"
        )
        console.error(
          "# Please add a valid sorting.tmporg.json                  #"
        )
        console.log(
          "# Add the file to your root folder: ./sorting.tmporg.json #"
        )
        console.log(
          "# # # # # # # # # # # # # # # # # # # # # # # # # # # # # #" +
            "\x1b[0m"
        )
      }
    }
  }
  throw new Error(
    "Could not load sorting file. Please add a valid sorting.tmporg.json"
  )
}

let elementAttributeSorting = await loadSortingSettings()

// Load config settings
async function loadConfigSettings() {
  const files = [`${projectRoot}/config.tmporg.json`, "config.json"]

  for (const [idx, file] of files.entries()) {
    try {
      return JSON.parse(await fsp.readFile(file))
    } catch (err) {
      if (idx === 0) {
        console.log(
          "\x1b[47m\x1b[31m# # # # # # # # # # # # # # # # # # # # # # # # # # # # # #"
        )
        console.error(
          "# Could not load config file.                             #"
        )
        console.error(
          "# Trying to use fallback config.json                      #"
        )
        console.error(
          "# Please add a valid config.tmporg.json                   #"
        )
        console.log(
          "# Add the file to your root folder: ./config.tmporg.json  #"
        )
        console.log(
          "# # # # # # # # # # # # # # # # # # # # # # # # # # # # # #" +
            "\x1b[0m"
        )
      }
    }
  }
  throw new Error(
    "Could not load sorting file. Please add a valid sorting.tmporg.json"
  )
}

let config = await loadConfigSettings()

export function sortElementAttributes(template) {
  if (!config.sortVueFiles) return template
  // Parse the HTML
  const handler = new DomHandler()
  const parser = new htmlparser2.Parser(handler, {
    lowerCaseTags: false,
    lowerCaseAttributeNames: false,
    recognizeSelfClosing: true,
    decodeEntities: false,
  })

  parser.write(template)
  parser.end()

  // Get the DOM
  const dom = handler.dom

  function sortAttributes(node) {
    if (node.nodeType !== 1) return

    const sortedAttributes = Object.keys(node.attribs)
      .map((key) => ({ name: key, value: node.attribs[key] }))
      .sort((a, b) => {
        const indexA = elementAttributeSorting.indexOf(a.name)
        const indexB = elementAttributeSorting.indexOf(b.name)
        return indexA - indexB || (indexA === -1 ? 1 : -1)
      })

    node.attribs = {}

    sortedAttributes.forEach(({ name, value }) => {
      // Handle Vue-specific syntax
      if (name.startsWith("@")) {
        node.attribs[name.replace(/^[@:]/, "v-on:")] = value
      } else if (name.startsWith("v-slot")) {
        node.attribs["temp-v-slot"] =
          name.replace("v-slot:", "") + (value ? `="${value}"` : "")
      } else if (name.startsWith("#")) {
        node.attribs["temp-slot"] = name.slice(1)
      } else {
        node.attribs[name] = value
      }
    })

    // Recursively sort child nodes
    if (node.children) {
      node.children.forEach(sortAttributes)
    }
  }

  // Traverse the DOM and modify it
  dom.forEach(sortAttributes)

  // Serialize the modified DOM back to HTML
  const templateResult = render(dom, {
    selfClosingTags: true,
    emptyAttrs: false,
    encodeEntities: false,
    decodeEntities: false,
  })

  const cleanVOn = templateResult.replace(/v-on:/g, "@")
  const replacedTempSlot = replaceTempSlot(cleanVOn)
  const replacedTempVSlot = replaceTempVSlot(replacedTempSlot)

  return replaceTempQuote(replacedTempVSlot)
}

function replaceTempQuote(input) {
  return input.replace(QUOTE_REGEX, '"')
}

function replaceTempSlot(input) {
  return input.replace(SLOT_REGEX, (_match, p1) => `#${p1}`)
}

function replaceTempVSlot(input) {
  return input.replace(SLOT_REGEX, (_match, p1) => `v-slot:${p1}`)
}

async function replaceTemplateInVueSFC(filePath, vueFileName = "xyz.vue") {
  try {
    // Read the current content of the Vue file
    let htmlContent = await fsp.readFile(filePath, "utf-8")

    // Search for the <template> tag
    const templateStart = htmlContent.search("<template>")

    if (templateStart === -1) return

    const templateStartStringLength = "<template>".length
    const templateEnd = htmlContent.lastIndexOf("</template>")

    // Check if <template> was found
    if (templateStart !== -1 && templateEnd !== -1) {
      // Extract the content of the <template> tag
      const templateContent = htmlContent.substring(
        templateStart + templateStartStringLength,
        templateEnd
      )

      // Sort the template content
      const sortedTemplateContent =
        "\n" + sortElementAttributes(templateContent) + "\n"

      // Replace the current content of the <template> tag with the new content
      htmlContent =
        htmlContent.substring(0, templateStart + templateStartStringLength) +
        sortedTemplateContent +
        htmlContent.substring(templateEnd)

      // Write the updated content back to the file
      await fsp.writeFile(filePath, htmlContent, "utf-8")

      if (config.showLogFiles)
        console.log(
          "--> File \x1b[33m" + vueFileName + "\x1b[0m has been edited"
        )
    } else {
      // <template> not found
      console.error(
        "\x1b[31mThe content of " + vueFileName + " was not found.\x1b[0m"
      )
    }
  } catch (error) {
    console.error("Error updating the file " + vueFileName, error.message)
  }
}

export async function processAllVueFiles(folderPath) {
  try {
    // Read all filenames in the folder
    const fileNames = await fsp.readdir(folderPath)

    // Filter only files with the extension ".vue"
    const vueFiles = fileNames.filter(
      (fileName) => path.extname(fileName) === ".vue"
    )

    // Process each Vue file in the current folder
    for (const vueFile of vueFiles) {
      const filePath = path.join(folderPath, vueFile)
      await replaceTemplateInVueSFC(filePath, vueFile)
    }

    // Also search through all subfolders
    for (const fileName of fileNames) {
      const filePath = path.join(folderPath, fileName)
      const stats = await fsp.stat(filePath)

      if (stats.isDirectory()) {
        // Recursively process subfolders
        await processAllVueFiles(filePath) // Await here to ensure proper async handling.
      }
    }

    if (config.showLogFolders) {
      console.log(
        `====> Folder \x1b[33m${folderPath}\x1b[0m has been processed.`
      )
      console.log(
        `- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - `
      )
    }
  } catch (error) {
    console.error("\x1b[31mError processing Vue files:\x1b[0m", error.message)
  }
}

// Start processing Vue files in the current directory.
await processAllVueFiles(".")
