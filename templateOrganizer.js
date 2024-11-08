import render from "dom-serializer"
import fsp from "fs/promises"
import * as htmlparser2 from "htmlparser2"
import { DomHandler } from "htmlparser2"
import path from "path"

const showLogFolders = false
const showLogFiles = true

// Navigate to the root directory of the project
let projectRoot = process.cwd().split("node_modules")[0]
if (projectRoot.endsWith("/")) {
  projectRoot = projectRoot.slice(0, -1)
}

// Get sorting settings
async function loadSortingSettings() {
  const files = [`${projectRoot}/sorting.tmporg.json`, "sorting.json"]

  for (const [idx, file] of files.entries()) {
    try {
      return JSON.parse(await fsp.readFile(file))
    } catch (err) {
      if (idx == 0) {
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
          "# # # # # # # # # # # # # # # # # # # # # # # # # # # # # #\x1b[0m"
        )
      }
    }
  }
  throw new Error(
    "Could not load sorting file. Please add a valid sorting.tmporg.json"
  )
}

let elementAttributeSorting = await loadSortingSettings()

export function sortElementAttributes(template) {
  // const doc = new jsdom.JSDOM(template)

  // Parse das HTML
  const handler = new DomHandler()
  const parser = new htmlparser2.Parser(handler, {
    lowerCaseTags: false,
    lowerCaseAttributeNames: false,
    recognizeSelfClosing: true,
    decodeEntities: false,
  })
  parser.write(template)
  parser.end()

  // Erhalte das DOM
  const dom = handler.dom

  function sortAttributes(node) {
    if (node.nodeType !== 1) return

    const attributes = Object.keys(node.attribs).map((key) => {
      return { name: key, value: node.attribs[key] }
    })
    const sortedAttributes = []

    attributes.forEach((attr) => {
      delete node.attribs[attr.name]
      sortedAttributes.push([attr.name, attr.value])
    })

    sortedAttributes.sort((a, b) => {
      const indexA = elementAttributeSorting.indexOf(a[0])
      const indexB = elementAttributeSorting.indexOf(b[0])

      if (indexA === -1 && indexB === -1) return 0
      if (indexA === -1) return 1
      if (indexB === -1) return -1

      return indexA - indexB
    })

    sortedAttributes.forEach(([name, value]) => {
      // Behalte die Vue-spezifische Syntax bei
      if (name.startsWith("@")) {
        node.attribs[name.replace(/^[@:]/, "v-on:")] = value
        // console.log('name', name)
        // console.log('value', value)
        // } else if (name.startsWith('v-') || name.startsWith(':')) {
        //   element.attribs[name] = value
      } else if (name.startsWith("v-slot")) {
        const valueAddon = `="${value}"`
        let t_value = name.replace("v-slot:", "")
        if (value) t_value += valueAddon
        const t_name = "temp-v-slot"
        node.attribs[t_name] = t_value
      } else if (name.startsWith("#")) {
        const t_value = name.replace("#", "")
        const t_name = "temp-slot"
        node.attribs[t_name] = t_value
      } else {
        node.attribs[name] = value
      }
    })

    // Rekursiv für Kinder durchlaufen
    if (node.children) {
      node.children.forEach(sortAttributes)
    }
  }

  // Durchlaufe das DOM und modifiziere es
  dom.forEach(sortAttributes)

  // sortAttributes(doc.window.document.body)

  // Serialisiere das modifizierte DOM zurück zu HTML
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
  const result = input
  const regex = /&quot;/g

  return result.replace(regex, '"')
}

function replaceTempSlot(input) {
  const result = input
  const regex = /temp-slot="([^"]*)"/g

  return result.replace(regex, (_match, p1) => {
    return `#${p1}`
  })
}

function replaceTempVSlot(input) {
  const result = input
  const regex = /temp-v-slot="([^"]*)"/g

  return result.replace(regex, (_match, p1) => {
    return `v-slot:${p1}`
  })
}

async function replaceTemplateInVueSFC(filePath, vueFileName = "xyz.vue") {
  try {
    // Read the current content of the Vue file
    let htmlContent = await fsp.readFile(filePath, "utf-8")

    // Search for the <template> tag
    const templateStart = htmlContent.search("<template>")
    if (templateStart === -1) return
    const templateStartString = htmlContent.match("<template>")[0]
    const templateStartStringLength = templateStartString.length
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

      if (showLogFiles)
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
        processAllVueFiles(filePath)
      }
    }
    if (showLogFolders) {
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

processAllVueFiles(".")
