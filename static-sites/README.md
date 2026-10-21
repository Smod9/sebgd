# Authored static sites

## Read the Shift

`read-the-shift/index.html` is the standalone copy of public Sites version 3 at
https://read-the-shift-sailing.sebgd.chatgpt.site, recovered on October 21, 2026.
Its sailing controls, SVG rendering, VMG calculations, animation, and stylesheet
were preserved. ChatGPT's outer iframe, host messaging, host theme bridge, and
unused external tooltip scripts were removed. A page title, description,
canonical URL, and responsive standalone page container were added.

The original ChatGPT Site remains available as a source/archive. Production
`shift.sebgd.com` serves the uploaded file through sebgd's static publisher.
The app needs no build step, external assets, or ChatGPT runtime.

To republish, set the existing admin token in your environment and run:

```sh
npm run publish:site -- --name shift static-sites/read-the-shift
```
