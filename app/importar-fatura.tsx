"use client";

import { useState } from "react";
import { categoriasAprendidas, interpretarFatura, type LinhaFatura, type ResultadoFatura } from "@/lib/fatura";
import { IconeUpload } from "./icones";
import { SelectCategoria, SelectPessoa } from "./lista-gastos";
import { Modal } from "./modal";
import { fmt } from "./ui";

export interface ItemImportado extends Omit<LinhaFatura, "categoria"> {
  categoria: string | null;
}

/**
 * Importa a fatura do cartão (CSV exportado pelo app do banco): mostra as compras
 * encontradas, deixa conferir e ajustar a categoria, e lança as que estiverem marcadas.
 */
export function ImportarFatura({
  mes,
  existentes,
  pessoas,
  onImportar,
}: {
  mes: string;
  /** compras que já estão no cartão neste mês (para marcar as repetidas) */
  existentes: { nome: string; valor: number; categoria?: string | null }[];
  pessoas: string[];
  /** Devolve uma mensagem de erro, ou null se deu certo. */
  onImportar: (itens: ItemImportado[], pessoa: string | null) => Promise<string | null>;
}) {
  const [aberto, setAberto] = useState(false);
  const [resultado, setResultado] = useState<ResultadoFatura | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
  const [categorias, setCategorias] = useState<Record<number, string>>({});
  const [pessoa, setPessoa] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  const fechar = () => {
    setAberto(false);
    setResultado(null);
    setNomeArquivo("");
    setMarcadas(new Set());
    setCategorias({});
    setPessoa("");
    setErro("");
  };

  const lerArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return;

    setErro("");
    setNomeArquivo(arquivo.name);

    if (arquivo.size > 2_000_000) {
      setResultado(null);
      setErro("O arquivo é grande demais para ser uma fatura (máximo 2 MB).");
      return;
    }

    const r = interpretarFatura(await arquivo.text(), existentes, categoriasAprendidas(existentes));

    setResultado(r);
    setCategorias(Object.fromEntries(r.linhas.map((l) => [l.id, l.categoria ?? ""])));
    // as que já estão lançadas começam desmarcadas, para não duplicar
    setMarcadas(new Set(r.linhas.filter((l) => !l.jaLancada).map((l) => l.id)));
    if (r.erro) setErro(r.erro);
  };

  const alternar = (id: number) =>
    setMarcadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });

  const linhas = resultado?.linhas ?? [];
  const escolhidas = linhas.filter((l) => marcadas.has(l.id));
  const total = escolhidas.reduce((acc, l) => acc + l.valor, 0);
  const jaLancadas = linhas.filter((l) => l.jaLancada).length;

  const importar = async () => {
    if (escolhidas.length === 0) {
      setErro("Marque pelo menos uma compra.");
      return;
    }

    setEnviando(true);
    const falha = await onImportar(
      escolhidas.map((l) => ({ ...l, categoria: categorias[l.id] || null })),
      pessoa || null
    );
    setEnviando(false);

    if (falha) setErro(falha);
    else fechar();
  };

  return (
    <>
      <button className="btn btn-outline btn-sm importar-btn" onClick={() => setAberto(true)}>
        <IconeUpload size={16} />
        Importar fatura (CSV)
      </button>

      {aberto && (
        <Modal
          titulo="Importar fatura do cartão"
          descricao={
            <>
              Use o arquivo CSV da fatura (no app do Nubank: fatura → exportar). As compras entram em{" "}
              <strong>
                {mes.slice(5, 7)}/{mes.slice(0, 4)}
              </strong>{" "}
              como alterações do mês: depois é só conferir e clicar em Salvar.
            </>
          }
          onFechar={fechar}
          larga
        >
          <label
            className={`soltar-arquivo ${arrastando ? "soltar-arquivo--ativo" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
              lerArquivo(e.dataTransfer.files?.[0]);
            }}
          >
            <IconeUpload size={22} />
            <span>
              {nomeArquivo ? (
                <>
                  <strong>{nomeArquivo}</strong> · escolher outro
                </>
              ) : (
                <>
                  <strong>Escolha o arquivo</strong> ou arraste aqui
                </>
              )}
            </span>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              aria-label="Arquivo CSV da fatura"
              onChange={(e) => lerArquivo(e.target.files?.[0])}
            />
          </label>

          {erro && <p className="auth-msg error">{erro}</p>}

          {resultado && linhas.length > 0 && (
            <>
              <p className="field-hint importar-resumo">
                {linhas.length} compras encontradas
                {resultado.ignoradas > 0 && `, ${resultado.ignoradas} linhas ignoradas (pagamentos e estornos)`}
                {jaLancadas > 0 && `, ${jaLancadas} já lançadas neste mês (desmarcadas)`}.
              </p>

              {pessoas.length > 0 && (
                <SelectPessoa value={pessoa} onChange={setPessoa} pessoas={pessoas} rotulo="Quem gastou (todas as compras)" />
              )}

              <ul className="importar-lista">
                {linhas.map((l) => (
                  <li key={l.id} className={`importar-linha ${marcadas.has(l.id) ? "" : "importar-linha--off"}`}>
                    <input
                      type="checkbox"
                      checked={marcadas.has(l.id)}
                      onChange={() => alternar(l.id)}
                      aria-label={`Importar ${l.nome}`}
                    />

                    <span className="linha-data">{l.dia ? String(l.dia).padStart(2, "0") : "—"}</span>

                    <span className="linha-nome" title={l.nome}>
                      <span className="linha-texto">{l.nome}</span>
                      {l.parcela && (
                        <span className="expense-badge">
                          {l.parcela.atual}/{l.parcela.total}
                        </span>
                      )}
                      {l.jaLancada && <span className="expense-tag">já lançada</span>}
                    </span>

                    <SelectCategoria
                      value={categorias[l.id] ?? ""}
                      onChange={(v) => setCategorias((c) => ({ ...c, [l.id]: v }))}
                      rotulo={`Categoria de ${l.nome}`}
                    />

                    <span className="expense-value linha-valor">{fmt(l.valor)}</span>
                  </li>
                ))}
              </ul>

              <p className="field-hint">
                Compras parceladas (ex.: parcela 3/10) são cadastradas como parceladas e aparecem nos próximos meses
                sozinhas.
              </p>
            </>
          )}

          <div className="modal-acoes modal-acoes--linha">
            <button className="btn btn-outline" onClick={fechar}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={enviando || escolhidas.length === 0} onClick={importar}>
              {enviando ? "Importando..." : `Importar ${escolhidas.length} compras (${fmt(total)})`}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
