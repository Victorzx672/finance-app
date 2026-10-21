import { Icon } from "./ui";

// Ícones usados em mais de um lugar (navegação, menus, cartões de resumo).

type P = { size?: number };

export const IconeMes = ({ size }: P) => (
  <Icon size={size}>
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V9.5" />
  </Icon>
);

export const IconeAlvo = ({ size }: P) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" />
  </Icon>
);

export const IconeGrafico = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Icon>
);

export const IconeLampada = ({ size }: P) => (
  <Icon size={size}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 00-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0012 3z" />
  </Icon>
);

export const IconeAjustes = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Icon>
);

export const IconeMais = ({ size }: P) => (
  <Icon size={size}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IconeOlho = ({ size, fechado }: P & { fechado?: boolean }) => (
  <Icon size={size}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
    {fechado && <path d="M3 3l18 18" />}
  </Icon>
);

export const IconeLua = ({ size }: P) => (
  <Icon size={size}>
    <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
  </Icon>
);

export const IconeSol = ({ size }: P) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </Icon>
);

export const IconeEmail = ({ size }: P) => (
  <Icon size={size}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 6l-10 7L2 6" />
  </Icon>
);

export const IconeDownload = ({ size }: P) => (
  <Icon size={size}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </Icon>
);

export const IconeSair = ({ size }: P) => (
  <Icon size={size}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
  </Icon>
);

export const IconeTeclado = ({ size }: P) => (
  <Icon size={size}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M10 13h4M7 16h10" />
  </Icon>
);

export const IconeCarteira = ({ size }: P) => (
  <Icon size={size}>
    <path d="M19 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-3" />
    <path d="M21 9h-5a3 3 0 000 6h5V9z" />
  </Icon>
);

export const IconeTendencia = ({ size }: P) => (
  <Icon size={size}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </Icon>
);

export const IconeRelogio = ({ size }: P) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </Icon>
);

export const IconeCalendario = ({ size }: P) => (
  <Icon size={size}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Icon>
);

export const IconeCheck = ({ size }: P) => (
  <Icon size={size}>
    <path d="M20 6L9 17l-5-5" />
  </Icon>
);

export const IconeX = ({ size }: P) => (
  <Icon size={size}>
    <path d="M18 6L6 18M6 6l12 12" />
  </Icon>
);

export const IconeLapis = ({ size }: P) => (
  <Icon size={size}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
  </Icon>
);

export const IconeAlerta = ({ size }: P) => (
  <Icon size={size}>
    <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Icon>
);

export const IconeSetaEsq = ({ size }: P) => (
  <Icon size={size}>
    <path d="M15 18l-6-6 6-6" />
  </Icon>
);

export const IconeSetaDir = ({ size }: P) => (
  <Icon size={size}>
    <path d="M9 18l6-6-6-6" />
  </Icon>
);

export const IconeSetaBaixo = ({ size }: P) => (
  <Icon size={size}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);

export const IconeBusca = ({ size }: P) => (
  <Icon size={size}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Icon>
);

export const IconeUpload = ({ size }: P) => (
  <Icon size={size}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  </Icon>
);

export const IconeCofre = ({ size }: P) => (
  <Icon size={size}>
    <path d="M19 9c0-3.3-3.1-6-7-6S5 5.7 5 9c0 1.6.7 3 1.9 4.1L6 17h3l.6-1.4c.8.2 1.6.4 2.4.4s1.6-.1 2.4-.4L15 17h3l-.9-3.9A5.6 5.6 0 0019 9z" />
    <path d="M12 6v1.5M10 10.5c0 .8.9 1.5 2 1.5s2-.7 2-1.5-.9-1.5-2-1.5-2-.7-2-1.5.9-1.5 2-1.5" />
  </Icon>
);

export const IconeEscudo = ({ size }: P) => (
  <Icon size={size}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </Icon>
);
