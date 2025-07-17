# VueTemplateOrganizer

VueTemplateOrganizer is a tool that allows you to configure the sorting of template blocks in Vue Single File Components (SFCs).

## Features

- **Configurable Sorting:** Customize the sorting of template blocks to fit your specific needs.
- **Support for Vue SFCs:** Use VueTemplateOrganizer with traditional Vue Single File Components.

## Not supported yet

- **Global install:** There is a known issue with path regarding global installation

## Getting Started

Follow these steps to get started with VueTemplateOrganizer in your project.

### Installation

```bash
npm install @derkatzelp/vuetemplateorganizer --save-dev
```

### Usage

```bash
npx tmp-organizer
```

## Configuration

### Sorting

You can customize the sorting behavior by adjusting the configuration in `sorting.json`. <br>
Each `group` has a `properties` section in which you can add your keys in a specific order.<br>
VueTemplateOrganizer will sort all properties by this given order.

### Options

| Key              | Values  | Default  | Description                                               |
|------------------|---------|----------|-----------------------------------------------------------|
| `showLogFiles`   | Boolean | `true`   | Enables or disables log report of touched Files           |
| `showLogFolders` | Boolean | `true`   | Enables or disables log report of touched Folders         |
| `sortVueFiles`   | Boolean | `true`   | Enables or disables sorting of Vue SFC Files              |
| `vueFolderPath`  | String  | `./src/` | Specifies the path to Vue SFC Files (subfolders included) |

## Examples

#### Before using VueTemplateOrganizer

```html

<template>
    <h1>Test Vue File for Vue Template Organizer</h1>
    <CustomComp class="class1" @click="testfnc" :id="comp1Id"/>
    <CustomComp2 @click="testfnc"/>
    <p class="par">Just a simple Test</p>
    <label for="txtinput">Your input here</label>
    <input type="text" class="input-c" id="txtinput" ref="myRef"/>
</template>
```

#### After using VueTemplateOrganizer

```html

<template>
    <h1>Test Vue File for Vue Template Organizer</h1>
    <CustomComp :id="comp1Id" class="class1" @click="testfnc"></CustomComp>
    <CustomComp2 @click="testfnc"></CustomComp2>
    <p class="par">Just a simple Test</p>
    <label for="txtinput">Your input here</label>
    <input id="txtinput" class="input-c" type="text" ref="myRef"/>
</template>
```

## Dependencies

VueTemplateOrganizer relies on the following external libraries:

- [dom-serializer](https://github.com/cheeriojs/dom-serializer) - For DOM element serialization
- [htmlparser2](https://github.com/fb55/htmlparser2) - For parsing HTML/Vue templates

## Contributing

If you'd like to contribute to VueTemplateOrganizer,
please [contact](https://github.com/DerKatzeLP/VueTemplateOrganizer) me.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgments

Special thanks to:
- The maintainers of dom-serializer and htmlparser2 for providing robust parsing tools
- The Vue.js community for inspiration and support
