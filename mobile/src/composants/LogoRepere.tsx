import Svg, { Path } from "react-native-svg";

/** Le signe Koté utilisé au lancement et partout où la marque apparaît. */
export function LogoRepere({ taille = 96 }: { taille?: number }) {
  return (
    <Svg
      accessibilityLabel="Logo Koté"
      width={taille}
      height={taille}
      viewBox="0 0 512 512"
    >
      <Path
        fill="#FF5C1A"
        fillRule="evenodd"
        d="M256 62C158 62 79 141 79 239C79 310 120 370 179 399L244 455V366L209 331C163 312 132 264 132 209C132 125 200 78 256 78C324 78 380 131 380 199C380 247 353 289 312 313L268 357V455L333 399C393 370 433 310 433 239C433 141 354 62 256 62ZM199 128H247V211L340 124H397L288 239L402 354H343L247 267V355H199V128Z"
      />
      <Path d="M268 357L337 426L268 484V357Z" fill="#0A64C4" />
    </Svg>
  );
}
