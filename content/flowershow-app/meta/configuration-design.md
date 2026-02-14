# Flowershow Configuration Design

Initial issue: https://github.com/flowershow/flowershow/issues/7

When setting up my site I want to change key parameters (e.g. site title, aspects of theme) so that I can change things without having to code

Also want to do this without getting into core code so that core remains update-able => separate config

# Notes

## How is config done in other file-based CMS?

- hugo: `config.yml` in root directory (plus other alternative formats)
- vuepress: ditto in `.vuepress` folder
  - Underlying code: https://github.com/vuejs/vuepress/blob/daa6404bf7b46331d0751af58a2c8a6c5c7cc3f9/packages/%40vuepress/core/lib/node/loadConfig.js
- [[notes/nextra]] uses a `theme.config.js` in root directory
