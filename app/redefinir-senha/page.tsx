import RedefinirForm from "./redefinir-form";

export default async function RedefinirSenha({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return <RedefinirForm token={token ?? ""} />;
}
