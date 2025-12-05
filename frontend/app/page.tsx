"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Lock,
} from "lucide-react";
import { Header } from "@/components/Header";

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [batches, setBatches] = useState<
    { batchId: string; sourceUrl?: string; itemCount?: number }[]
  >([]);

  const [selectors, setSelectors] = useState({
    container: "details",
    edital: "h4",
    descricao: "h3",
    titulo: "summary",
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [keyField, setKeyField] = useState("edital");
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState("");
  const [copiedSelector, setCopiedSelector] = useState("");
  const [selectedSelector, setSelectedSelector] = useState<{
    selector: string;
    text: string;
    tagName: string;
  } | null>(null);

  const [mapping, setMapping] = useState({
    edital: "",
    titulo: "",
    descricao: "",
  });
  const [columns, setColumns] = useState<string[]>([]);

  useEffect(() => {
    fetchBatches();
    fetchSchema();

    // Listen for messages from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "SELECTOR_CLICKED") {
        setSelectedSelector({
          selector: event.data.selector,
          text: event.data.text,
          tagName: event.data.tagName,
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const fetchSchema = async () => {
    try {
      const res = await axios.get(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        }/audit/schema`
      );
      setColumns(res.data);
    } catch (error) {
      console.error("Failed to fetch schema", error);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await axios.get(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        }/audit/batches`
      );
      setBatches(res.data);
    } catch (error) {
      console.error("Failed to fetch batches", error);
    }
  };

  const handleImport = async () => {
    if (!url) return;
    setIsLoading(true);
    try {
      await axios.post(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        }/scraper/run`,
        {
          url,
          selectors: showAdvanced ? selectors : undefined,
        }
      );
      setUrl("");
      await fetchBatches();
      alert("Importação concluída com sucesso!");
    } catch (error) {
      console.error("Import failed", error);
      alert("Erro ao importar dados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewHtml = async () => {
    if (!url) return;
    setIsLoading(true);
    try {
      const res = await axios.post(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        }/scraper/preview`,
        { url }
      );
      setHtmlPreview(res.data.html);
      setShowHtmlPreview(true);
      if (res.data.count) {
        console.log(`Encontrados ${res.data.count} containers na página`);
      }
    } catch (error) {
      console.error("Preview failed", error);
      alert("Erro ao carregar preview do HTML.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <header>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-700">
              Ferramenta de Auditoria e Correção de Dados
            </p>
          </header>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              Nova Importação
            </h2>
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="Cole a URL do site aqui..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              />
              <button
                onClick={handlePreviewHtml}
                disabled={isLoading || !url}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Preview HTML
              </button>
              <button
                onClick={handleImport}
                disabled={isLoading || !url}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Importar
              </button>
            </div>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              {showAdvanced
                ? "Ocultar Opções Avançadas"
                : "Mostrar Opções Avançadas (Seletores)"}
            </button>

            {showAdvanced && (
              <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">
                    Container (Item)
                  </label>
                  <input
                    type="text"
                    value={selectors.container}
                    onChange={(e) =>
                      setSelectors({ ...selectors, container: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded text-sm text-gray-900"
                    placeholder="ex: details"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">
                    Seletor de Título
                  </label>
                  <input
                    type="text"
                    value={selectors.titulo}
                    onChange={(e) =>
                      setSelectors({ ...selectors, titulo: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded text-sm text-gray-900"
                    placeholder="ex: summary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">
                    Seletor de Edital
                  </label>
                  <input
                    type="text"
                    value={selectors.edital}
                    onChange={(e) =>
                      setSelectors({ ...selectors, edital: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded text-sm text-gray-900"
                    placeholder="ex: h2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">
                    Seletor de Descrição
                  </label>
                  <input
                    type="text"
                    value={selectors.descricao}
                    onChange={(e) =>
                      setSelectors({ ...selectors, descricao: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded text-sm text-gray-900"
                    placeholder="ex: h3"
                  />
                </div>
                <div className="col-span-2 text-xs text-gray-700">
                  * Os seletores internos (Título, Edital, Descrição) são
                  buscados DENTRO do Container.
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Mapeamento do Banco de Produção (Obrigatório)
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Configure o mapeamento ANTES de acessar um lote para
                  auditoria.
                </p>
              </div>
              {mapping.edital ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700">
                    Mapeamento Configurado
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-medium text-red-700">
                    Mapeamento Incompleto
                  </span>
                </div>
              )}
            </div>

            <div className="mb-4 p-4 bg-orange-50 border-l-4 border-orange-400 rounded">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-orange-900 mb-1">
                    ⚠️ IMPORTANTE: Como funciona o mapeamento
                  </p>
                  <p className="text-xs text-orange-800">
                    O mapeamento define como os dados do site serão comparados
                    com o banco de produção.
                    <strong>
                      {" "}
                      Você DEVE configurar pelo menos a "Coluna Chave" antes de
                      clicar em um lote.
                    </strong>
                    O mapeamento não é salvo automaticamente na importação -
                    você precisa selecioná-lo aqui toda vez.
                  </p>
                </div>
              </div>
            </div>

            {columns.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-medium text-blue-900 mb-2">
                  ✓ Colunas disponíveis no banco:
                </p>
                <p className="text-xs text-blue-700">{columns.join(", ")}</p>
              </div>
            )}

            {!columns.length && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-medium text-yellow-900">
                  ⚠️ Aguardando conexão com o banco de produção...
                </p>
              </div>
            )}

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
                  Campo Chave (Site)
                </label>
                <select
                  value={keyField}
                  onChange={(e) => setKeyField(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm bg-blue-50 border-blue-200 text-blue-800 font-medium"
                >
                  <option value="edital">Edital</option>
                  <option value="titulo">Título</option>
                  <option value="processo">Processo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
                  Coluna Chave (Banco) <span className="text-red-500">*</span>
                </label>
                <select
                  value={mapping.edital}
                  onChange={(e) =>
                    setMapping({ ...mapping, edital: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded text-sm ${
                    mapping.edital
                      ? "bg-white border-green-300"
                      : "bg-red-50 border-red-300"
                  } text-gray-900`}
                >
                  <option value="">Selecione...</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
                  Coluna de Título
                </label>
                <select
                  value={mapping.titulo}
                  onChange={(e) =>
                    setMapping({ ...mapping, titulo: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded text-sm ${
                    mapping.titulo
                      ? "bg-white border-green-300"
                      : "bg-white border-gray-300"
                  } text-gray-900`}
                >
                  <option value="">Selecione...</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
                  Coluna de Descrição
                </label>
                <select
                  value={mapping.descricao}
                  onChange={(e) =>
                    setMapping({ ...mapping, descricao: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded text-sm ${
                    mapping.descricao
                      ? "bg-white border-green-300"
                      : "bg-white border-gray-300"
                  } text-gray-900`}
                >
                  <option value="">Selecione...</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Lotes Importados
            </h2>
            {!mapping.edital && batches.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> Configure o mapeamento acima antes
                  de acessar os lotes.
                </p>
              </div>
            )}
            <div className="grid gap-4">
              {batches.map((batch) => {
                const isMappingConfigured = !!mapping.edital;
                return (
                  <div
                    key={batch.batchId}
                    className={`bg-white p-4 rounded-lg border transition-all ${
                      isMappingConfigured
                        ? "border-gray-200 hover:border-blue-500 hover:shadow-md group"
                        : "border-red-300 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {isMappingConfigured ? (
                        <Link
                          href={{
                            pathname: `/audit/${batch.batchId}`,
                            query: {
                              map_edital: mapping.edital,
                              map_titulo: mapping.titulo,
                              map_descricao: mapping.descricao,
                              key_field: keyField,
                            },
                          }}
                          className="flex-1 flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">
                              Lote: {batch.batchId}
                            </p>
                            {batch.sourceUrl && (
                              <p
                                className="text-xs text-blue-600 truncate"
                                title={batch.sourceUrl}
                              >
                                🔗 {batch.sourceUrl}
                              </p>
                            )}
                            <p className="text-sm text-gray-700">
                              {batch.itemCount
                                ? `${batch.itemCount} itens`
                                : "Clique para revisar"}
                            </p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 shrink-0 ml-2" />
                        </Link>
                      ) : (
                        <div
                          onClick={() => {
                            alert(
                              '⚠️ Por favor, configure o mapeamento do banco de produção antes de acessar o lote.\n\nSelecione pelo menos a "Coluna Chave (Banco)" na seção de mapeamento acima.'
                            );
                            // Scroll to mapping section
                            document.querySelector("h2")?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }}
                          className="flex-1 flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <Lock className="w-5 h-5 text-red-500 shrink-0 mt-1" />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900">
                                Lote: {batch.batchId}
                              </p>
                              {batch.sourceUrl && (
                                <p
                                  className="text-xs text-blue-600 truncate"
                                  title={batch.sourceUrl}
                                >
                                  🔗 {batch.sourceUrl}
                                </p>
                              )}
                              {batch.itemCount && (
                                <p className="text-xs text-gray-600">
                                  {batch.itemCount} itens
                                </p>
                              )}
                              <p className="text-sm text-red-700 font-medium">
                                ⚠️ Configure o mapeamento acima para acessar
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={async () => {
                          if (
                            confirm("Tem certeza que deseja excluir este lote?")
                          ) {
                            try {
                              await axios.delete(
                                `${
                                  process.env.NEXT_PUBLIC_API_URL ||
                                  "http://localhost:3000"
                                }/audit/batch/${batch.batchId}`
                              );
                              await fetchBatches();
                            } catch (error) {
                              console.error("Failed to delete batch", error);
                              alert("Erro ao excluir lote.");
                            }
                          }
                        }}
                        className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}
              {batches.length === 0 && (
                <p className="text-gray-700 text-center py-8">
                  Nenhum lote importado ainda.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* HTML Preview Modal - Interactive */}
        {showHtmlPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Preview dos Containers - Descubra os Seletores
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Mostrando apenas o conteúdo dos primeiros 3 containers
                    (&lt;details&gt;)
                  </p>
                </div>
                <button
                  onClick={() => setShowHtmlPreview(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex">
                {/* Rendered Containers Preview */}
                <div className="flex-1 p-4 overflow-auto bg-gray-100">
                  <div className="bg-white rounded shadow-lg p-4">
                    <iframe
                      srcDoc={`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <style>
                          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                          details { margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; border-radius: 8px; }
                          summary { cursor: pointer; font-weight: bold; padding: 10px; background: #f0f0f0; border-radius: 4px; }
                          h3, h4 { margin: 10px 0; }
                          p { margin: 5px 0; }
                          .clickable:hover { background: #e3f2fd; outline: 2px solid #2196f3; cursor: pointer; }
                        </style>
                      </head>
                      <body>${htmlPreview}</body>
                      </html>
                    `}
                      className="w-full h-[600px] border-0"
                      sandbox="allow-same-origin allow-scripts"
                      onLoad={(e) => {
                        const iframe = e.target as HTMLIFrameElement;
                        const doc = iframe.contentDocument;
                        if (doc) {
                          // Add click handlers to all elements
                          const addClickHandlers = (element: Element) => {
                            element.addEventListener("click", (event) => {
                              event.stopPropagation();
                              const target = event.target as HTMLElement;

                              // Generate selector
                              let selector = target.tagName.toLowerCase();
                              if (target.className) {
                                const classes = target.className
                                  .split(" ")
                                  .filter((c) => c && c !== "clickable");
                                if (classes.length > 0) {
                                  selector += "." + classes.join(".");
                                }
                              }
                              if (target.id) {
                                selector = "#" + target.id;
                              }

                              // Send message to parent
                              window.parent.postMessage(
                                {
                                  type: "SELECTOR_CLICKED",
                                  selector: selector,
                                  text:
                                    target.textContent?.substring(0, 100) || "",
                                  tagName: target.tagName.toLowerCase(),
                                },
                                "*"
                              );
                            });
                            element.classList.add("clickable");
                          };

                          // Add handlers to all elements
                          doc.querySelectorAll("*").forEach(addClickHandlers);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Selector Info Panel */}
                <div className="w-80 border-l bg-gray-50 p-4 overflow-auto">
                  {selectedSelector ? (
                    <>
                      <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-500 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center justify-between">
                          <span>Elemento Selecionado</span>
                          <button
                            onClick={() => setSelectedSelector(null)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            ✕
                          </button>
                        </h4>
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-blue-700 font-medium">
                              Tag:
                            </label>
                            <code className="block bg-white px-2 py-1 rounded text-sm text-gray-900 font-mono mt-1">
                              &lt;{selectedSelector.tagName}&gt;
                            </code>
                          </div>
                          <div>
                            <label className="text-xs text-blue-700 font-medium">
                              Seletor CSS:
                            </label>
                            <div className="flex gap-2 mt-1">
                              <code className="flex-1 bg-white px-2 py-1 rounded text-sm text-blue-600 font-mono">
                                {selectedSelector.selector}
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    selectedSelector.selector
                                  );
                                  setCopiedSelector(selectedSelector.selector);
                                  setTimeout(() => setCopiedSelector(""), 3000);
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                              >
                                Copiar
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-blue-700 font-medium">
                              Conteúdo:
                            </label>
                            <div className="bg-white px-2 py-1 rounded text-xs text-gray-700 mt-1 max-h-20 overflow-y-auto">
                              {selectedSelector.text}
                            </div>
                          </div>
                        </div>
                        {copiedSelector && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                            ✓ Seletor copiado!
                          </div>
                        )}
                      </div>
                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                          Ou escolha um seletor comum:
                        </h4>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Seletores Comuns:
                      </h4>
                      <p className="text-xs text-gray-600 mb-3">
                        Clique em um elemento à esquerda ou escolha abaixo
                      </p>
                    </>
                  )}

                  {copiedSelector && !selectedSelector && (
                    <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                      ✓ Copiado:{" "}
                      <code className="font-mono">{copiedSelector}</code>
                    </div>
                  )}

                  <div className="space-y-2">
                    {[
                      {
                        label: "Container (cada item)",
                        selector: "details",
                        desc: "Tag que envolve cada licitação",
                      },
                      {
                        label: "Título do Processo",
                        selector: "summary",
                        desc: "Ex: Processo Licitatório 004/2017",
                      },
                      {
                        label: "Descrição/Objeto",
                        selector: "h3",
                        desc: "Texto do objeto da licitação",
                      },
                      {
                        label: "Edital",
                        selector: "h4",
                        desc: "Ex: Edital - nº 001/2017",
                      },
                      {
                        label: "Parágrafo",
                        selector: "p",
                        desc: "Texto em parágrafo",
                      },
                      {
                        label: "Div com classe",
                        selector: "div.conteudo",
                        desc: "Div com classe específica",
                      },
                    ].map((item) => (
                      <button
                        key={item.selector}
                        onClick={() => {
                          navigator.clipboard.writeText(item.selector);
                          setCopiedSelector(item.selector);
                          setTimeout(() => setCopiedSelector(""), 3000);
                        }}
                        className="w-full text-left p-3 bg-white border border-gray-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900 group-hover:text-blue-700">
                              {item.label}
                            </div>
                            <code className="text-xs bg-gray-100 px-1 rounded text-blue-600 font-mono">
                              {item.selector}
                            </code>
                            <div className="text-xs text-gray-500 mt-1">
                              {item.desc}
                            </div>
                          </div>
                          <svg
                            className="w-4 h-4 text-gray-400 group-hover:text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded">
                    <h5 className="font-semibold text-blue-900 text-sm mb-2">
                      Dica:
                    </h5>
                    <p className="text-xs text-blue-800">
                      Use Ctrl+F no código HTML para encontrar o conteúdo que
                      você procura e identificar qual tag está sendo usada.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex justify-between">
                <button
                  onClick={() => setShowHtmlPreview(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    setShowHtmlPreview(false);
                    setShowAdvanced(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ir para Opções Avançadas
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
