export const softwareVersions = Object.freeze({
  ui: Object.freeze({
    name: process.env.NEXT_PUBLIC_UI_SOFTWARE_NAME ?? 'sw-lavender',
    version: process.env.NEXT_PUBLIC_UI_VERSION ?? '0.0.0',
  }),
  api: Object.freeze({
    name: process.env.NEXT_PUBLIC_API_SOFTWARE_NAME ?? 'sw-juniper',
    version: process.env.NEXT_PUBLIC_API_VERSION ?? '0.0.0',
  }),
});
