# Volumi

A minimal Manifest V3 Chrome extension for adjusting the active tab's audio gain from 0% to 200%, with a reset-to-100 button.

## Install

1. Unzip `Volumi.zip`.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Select **Load unpacked** and choose the `volumi_extension` folder.
5. Pin Volumi from the Extensions menu if you want quick access.

## Use

1. Open a normal website with audio.
2. Click the Volumi extension icon.
3. Move the slider from 0 to 200, or select **Reset to 100**.

## Important limitations

- Chrome restricts capture of certain protected pages, Chrome Web Store pages, and browser-internal pages.
- If capture fails, reload the tab and try again.
- Tab capture routes the captured tab's audio through the extension's audio pipeline. The slider applies gain; above 100% can distort or clip audio.
- Chrome's extension audio APIs may behave differently across versions. Test on the sites you use most.

## Fonts

The CSS is configured to use BB Anonym Pro Bold for headings and FF Unit Rounded Pro Regular for body text. Network access was unavailable while packaging, so the requested font files could not be bundled in this build. Add the font files to `fonts/` using these exact filenames:
- `BBAnonymPro-Bold.ttf`
- `FFUnitRoundedPro-Regular.woff2`

If the font files are missing, the extension falls back to Arial.
