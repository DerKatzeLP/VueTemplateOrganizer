#!/usr/bin/env node

import { execSync } from "child_process"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

// Constants
const SCRIPT_COMMAND = "npm run sort"
const EXEC_OPTIONS = { stdio: "inherit" }

// Convert the URL to a path
const __filename = fileURLToPath(import.meta.url)
// Determine the directory of the current script
const __dirname = dirname(__filename)

// Change the working directory to the location of your package
const packageDirectory = join(__dirname, "..") // Adjust according to where your script is located

try {
    console.log(`Changing to directory: ${packageDirectory}`)
    process.chdir(packageDirectory)

    console.log(`Executing command: ${SCRIPT_COMMAND}`)
    // Execute the "sort" command from "scripts"
    execSync(SCRIPT_COMMAND, EXEC_OPTIONS)

    console.log("Template organization completed successfully!")
} catch (error) {
    console.error("Error executing template organizer:", error.message)
    process.exit(1)
}
