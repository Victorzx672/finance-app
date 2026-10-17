export const SENHA_MIN = 8;

const USUARIO_REGEX = /^[A-Za-z0-9._-]{3,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizarEmail = (v: unknown) =>
  typeof v === "string" ? v.trim().toLowerCase() : "";

export const emailValido = (email: string) =>
  email.length <= 254 && EMAIL_REGEX.test(email);

/** Usuário sem "@", para não confundir com e-mail no login. */
export const usuarioValido = (usuario: string) => USUARIO_REGEX.test(usuario);

export const senhaValida = (senha: unknown): senha is string =>
  typeof senha === "string" && senha.length >= SENHA_MIN && senha.length <= 72;

/** Resposta padrão para rotas que não podem revelar se uma conta existe. */
export const respostaGenerica = () => Response.json({ success: true });
