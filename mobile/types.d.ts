/**
 * Le bundler web d'Expo sait importer une feuille de style ; TypeScript, lui,
 * ne connait pas ce type d'import. Cette declaration le lui apprend.
 */
declare module "*.css";
