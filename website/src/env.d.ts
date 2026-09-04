// Starlight 0.42.0 ships compiled JS with separate .d.ts files (upstream
// withastro/starlight#3572) and no longer carries ambient declarations for its
// `virtual:starlight/*` modules — those previously came along incidentally
// because its raw .ts sources were pulled into our type program. Component
// overrides that import them need the declaration locally.
declare module "virtual:starlight/user-config" {
  const config: import("@astrojs/starlight/types").StarlightConfig;
  export default config;
}
