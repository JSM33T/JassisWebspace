export const productVersion = Object.freeze({
  software: process.env.NEXT_PUBLIC_SOFTWARE_NAME ?? 'sw-lavender',
  version: process.env.NEXT_PUBLIC_PRODUCT_VERSION ?? '0.0.0',
});
