"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Settings,
  X,
  Save,
} from "lucide-react";
import { Header } from "@/components/Header";

interface BatchConfig {
  keyField: string;
  mapEdital: string;
  mapTitulo?: string;
  mapDescricao?: string;
}

interface Batch {
  batchId: string;
  sourceUrl?: string;
  itemCount?: number;
  hasConfig?: boolean;
  config?: BatchConfig | null;
}

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [selectors, setSelectors] = useState({
    container: "details",
    edital: "h4",
    descricao: "h3",
    titulo: "summary",
  });

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMapping, setImportMapping] = useState({
    keyField: "edital",
    mapEdital: "",
    mapTitulo: "",
    mapDescricao: "",
  });

  // Edit mapping modal state
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editMapping, setEditMapping] = useState({
    keyField: "edital",
    mapEdital: "",
    mapTitulo: "",
    mapDescricao: "",
  });
  const [isSavingMapping, setIsSavingMapping] = useState(false);

  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState("");
  const [copiedSelector, setCopiedSelector] = useState("");
  const [selectedSelector, setSelectedSelector] = useState<{
    selector: string;
    text: string;
    tagName: string;
  } | null>(null);

  const [columns, setColumns] = useState<string[]>([]);

  useEffect(() => {
    fetchBatches();
    fetchSchema();

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

  const handleStartImport = () => {
    if (!url) return;
    // Open modal to configure mapping
    setShowImportModal(true);
  };

  const handleConfirmImport = async () => {
    if (!importMapping.mapEdital) {
      alert("Por favor, selecione a Coluna Chave (Banco) antes de importar.");
      return;
    }

    setIsLoading(true);
    try {
      // First, run the scraper
      const res = await axios.post(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        }/scraper/run`,
        {
          url,
          selectors,
        }
      );

      const batchId = res.data.batchId;

      // Then save the mapping config for this batch
      await axios.post(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        }/audit/batch/${batchId}/config`,
        {
          keyField: importMapping.keyField,
          mapEdital: importMapping.mapEdital,
          mapTitulo: importMapping.mapTitulo || undefined,
          mapDescricao: importMapping.mapDescricao || undefined,
          sourceUrl: url,
        }
      );

      setUrl("");
      setShowImportModal(false);
      setImportMapping({
        keyField: "edital",
        mapEdital: "",
        mapTitulo: "",
        mapDescricao: "",
      });
      await fetchBatches();
      alert("Importação concluída com sucesso!");
    } catch (error) {
      console.error("Import failed", error);
      alert("Erro ao importar dados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMapping = async () => {
    if (!editingBatch) return;
    if (!editMapping.mapEdital) {
      alert("Por favor, selecione a Coluna Chave (Banco).");
      return;
    }

    setIsSavingMapping(true);
    try {
      await axios.post(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        }/audit/batch/${editingBatch.batchId}/config`,
        {
          keyField: editMapping.keyField,
          mapEdital: editMapping.mapEdital,
          mapTitulo: editMapping.mapTitulo || undefined,
          mapDescricao: editMapping.mapDescricao || undefined,
        }
      );
      setEditingBatch(null);
      await fetchBatches();
    } catch (error) {
      console.error("Failed to save mapping", error);
      alert("Erro ao salvar mapeamento.");
    } finally {
      setIsSavingMapping(false);
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
    } catch (error) {
      console.error("Preview failed", error);
      alert("Erro ao carregar preview do HTML.");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditMapping = (batch: Batch) => {
    setEditingBatch(batch);
    setEditMapping({
      keyField: batch.config?.keyField || "edital",
      mapEdital: batch.config?.mapEdital || "",
      mapTitulo: batch.config?.mapTitulo || "",
      mapDescricao: batch.config?.mapDescricao || "",
    });
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

          {/* Nova Importação */}
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
                onClick={handleStartImport}
                disabled={isLoading || !url}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Importar
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="col-span-2 text-sm font-semibold text-gray-900">
                Seletores CSS
              </h3>
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
                * Os seletores internos (Título, Edital, Descrição) são buscados
                DENTRO do Container.
              </div>
            </div>
          </div>

          {/* Colunas disponíveis */}
          {columns.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm font-medium text-blue-900 mb-2">
                ✓ Colunas disponíveis no banco de produção:
              </p>
              <p className="text-sm text-blue-700">{columns.join(", ")}</p>
            </div>
          )}

          {/* Lotes Importados */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Lotes Importados
            </h2>
            <div className="grid gap-4">
              {batches.map((batch) => (
                <div
                  key={batch.batchId}
                  className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={
                        batch.hasConfig
                          ? {
                              pathname: `/audit/${batch.batchId}`,
                              query: {
                                map_edital: batch.config?.mapEdital,
                                map_titulo: batch.config?.mapTitulo || "",
                                map_descricao: batch.config?.mapDescricao || "",
                                key_field: batch.config?.keyField || "edital",
                              },
                            }
                          : "#"
                      }
                      onClick={(e) => {
                        if (!batch.hasConfig) {
                          e.preventDefault();
                          openEditMapping(batch);
                        }
                      }}
                      className="flex-1 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            Lote: {batch.batchId}
                          </p>
                          {batch.hasConfig ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Configurado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              Sem mapeamento
                            </span>
                          )}
                        </div>
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

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => openEditMapping(batch)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar mapeamento"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
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
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {batches.length === 0 && (
                <p className="text-gray-700 text-center py-8">
                  Nenhum lote importado ainda.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Import Modal - Configure mapping before import */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-bold text-gray-900">
                  Configurar Mapeamento
                </h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Configure como os dados do site serão comparados com o banco
                    de produção. Este mapeamento será salvo junto com o lote.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Campo Chave (Site)
                    </label>
                    <select
                      value={importMapping.keyField}
                      onChange={(e) =>
                        setImportMapping({
                          ...importMapping,
                          keyField: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded text-sm bg-blue-50 border-blue-200 text-blue-800 font-medium"
                    >
                      <option value="edital">Edital</option>
                      <option value="titulo">Título</option>
                      <option value="processo">Processo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Coluna Chave (Banco){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={importMapping.mapEdital}
                      onChange={(e) =>
                        setImportMapping({
                          ...importMapping,
                          mapEdital: e.target.value,
                        })
                      }
                      className={`w-full px-3 py-2 border rounded text-sm ${
                        importMapping.mapEdital
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
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Coluna de Título
                    </label>
                    <select
                      value={importMapping.mapTitulo}
                      onChange={(e) =>
                        setImportMapping({
                          ...importMapping,
                          mapTitulo: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
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
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Coluna de Descrição
                    </label>
                    <select
                      value={importMapping.mapDescricao}
                      onChange={(e) =>
                        setImportMapping({
                          ...importMapping,
                          mapDescricao: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
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

              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isLoading || !importMapping.mapEdital}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Importar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Mapping Modal */}
        {editingBatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-bold text-gray-900">
                  Editar Mapeamento - {editingBatch.batchId}
                </h3>
                <button
                  onClick={() => setEditingBatch(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Campo Chave (Site)
                    </label>
                    <select
                      value={editMapping.keyField}
                      onChange={(e) =>
                        setEditMapping({
                          ...editMapping,
                          keyField: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded text-sm bg-blue-50 border-blue-200 text-blue-800 font-medium"
                    >
                      <option value="edital">Edital</option>
                      <option value="titulo">Título</option>
                      <option value="processo">Processo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Coluna Chave (Banco){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editMapping.mapEdital}
                      onChange={(e) =>
                        setEditMapping({
                          ...editMapping,
                          mapEdital: e.target.value,
                        })
                      }
                      className={`w-full px-3 py-2 border rounded text-sm ${
                        editMapping.mapEdital
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
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Coluna de Título
                    </label>
                    <select
                      value={editMapping.mapTitulo}
                      onChange={(e) =>
                        setEditMapping({
                          ...editMapping,
                          mapTitulo: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
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
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Coluna de Descrição
                    </label>
                    <select
                      value={editMapping.mapDescricao}
                      onChange={(e) =>
                        setEditMapping({
                          ...editMapping,
                          mapDescricao: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
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

              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setEditingBatch(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveMapping}
                  disabled={isSavingMapping || !editMapping.mapEdital}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSavingMapping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HTML Preview Modal */}
        {showHtmlPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Preview dos Containers
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Clique nos elementos para descobrir seus seletores CSS
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
                          const addClickHandlers = (element: Element) => {
                            element.addEventListener("click", (event) => {
                              event.stopPropagation();
                              const target = event.target as HTMLElement;
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
                          doc.querySelectorAll("*").forEach(addClickHandlers);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="w-80 border-l bg-gray-50 p-4 overflow-auto">
                  {selectedSelector ? (
                    <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-500 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">
                        Elemento Selecionado
                      </h4>
                      <div className="space-y-2">
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
                                setTimeout(() => setCopiedSelector(""), 2000);
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
                          ✓ Copiado!
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 mb-3">
                      Clique em um elemento à esquerda para ver seu seletor
                    </p>
                  )}

                  <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                    Seletores Comuns:
                  </h4>
                  <div className="space-y-2">
                    {[
                      { label: "Container", selector: "details" },
                      { label: "Título", selector: "summary" },
                      { label: "Descrição", selector: "h3" },
                      { label: "Edital", selector: "h4" },
                      { label: "Parágrafo", selector: "p" },
                    ].map((item) => (
                      <button
                        key={item.selector}
                        onClick={() => {
                          navigator.clipboard.writeText(item.selector);
                          setCopiedSelector(item.selector);
                          setTimeout(() => setCopiedSelector(""), 2000);
                        }}
                        className="w-full text-left p-2 bg-white border border-gray-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm"
                      >
                        <span className="font-medium">{item.label}:</span>{" "}
                        <code className="text-blue-600">{item.selector}</code>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => setShowHtmlPreview(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
