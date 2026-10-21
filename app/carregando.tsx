/** Esqueleto da tela enquanto a sessão e os dados carregam (no lugar de uma tela vazia). */
export function TelaCarregando() {
  return (
    <div className="carregando" aria-busy="true" aria-label="Carregando">
      <div className="carregando-lateral esqueleto" />
      <div className="carregando-corpo">
        <div className="esqueleto esqueleto--titulo" />
        <div className="carregando-linha">
          <div className="esqueleto esqueleto--hero" />
          <div className="esqueleto esqueleto--hero esqueleto--menor" />
        </div>
        <div className="carregando-grade">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="esqueleto esqueleto--kpi" />
          ))}
        </div>
        <div className="esqueleto esqueleto--bloco" />
      </div>
    </div>
  );
}
