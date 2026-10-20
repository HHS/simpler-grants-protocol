// Starlight's `virtual:starlight/*` modules have no shipped types, so the
// component overrides that import them need this declaration.
declare module "virtual:starlight/user-config" {
  const config: import("@astrojs/starlight/types").StarlightConfig;
  export default config;
}
