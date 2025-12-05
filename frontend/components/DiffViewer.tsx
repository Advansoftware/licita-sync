'use client';

import { useState } from 'react';
import { Check, AlertTriangle, ArrowRight, X, Edit2 } from 'lucide-react';
import { clsx } from 'clsx';
import axios from 'axios';

interface ItemData {
  id: number;
  titulo: string;
  descricao: string;
  edital: string;
}

interface DiffViewerProps {
  item: {
    staging: ItemData & { status: string };
    legacy: ItemData | null;
    diff: boolean;
  };
  onSync: () => void;
  mapping: { edital?: string; titulo?: string; descricao?: string };
  keyField: string;
}

export function DiffViewer({ item, onSync, mapping, keyField }: DiffViewerProps) {
  const [selectedChanges, setSelectedChanges] = useState<{ [key: string]: boolean }>({
    titulo: item.legacy?.titulo !== item.staging.titulo,
    descricao: item.legacy?.descricao !== item.staging.descricao,
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Edit mode states
  const [isEditingTitulo, setIsEditingTitulo] = useState(false);
  const [isEditingDescricao, setIsEditingDescricao] = useState(false);
  const [editedTitulo, setEditedTitulo] = useState(item.staging.titulo);
  const [editedDescricao, setEditedDescricao] = useState(item.staging.descricao);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleConfirmSync = async () => {
    setIsSyncing(true);
    setShowConfirmModal(false);
    try {
      const fieldsToUpdate = Object.keys(selectedChanges).filter(k => selectedChanges[k]);
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/audit/sync/${item.staging.id}`, {
        fieldsToUpdate,
        mapping,
        keyField
      });
      onSync();
    } catch (error) {
      console.error('Failed to sync', error);
      alert('Erro ao sincronizar');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleChange = (field: string) => {
    setSelectedChanges(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveEdit = async (field: 'titulo' | 'descricao') => {
    setIsSavingEdit(true);
    try {
      const updates = field === 'titulo' 
        ? { titulo: editedTitulo }
        : { descricao: editedDescricao };
      
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/audit/staging/${item.staging.id}`,
        updates
      );
      
      // Update local state
      item.staging[field] = field === 'titulo' ? editedTitulo : editedDescricao;
      
      // Exit edit mode
      if (field === 'titulo') setIsEditingTitulo(false);
      else setIsEditingDescricao(false);
      
      // Refresh data
      onSync();
    } catch (error) {
      console.error('Failed to save edit', error);
      alert('Erro ao salvar edição');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelEdit = (field: 'titulo' | 'descricao') => {
    if (field === 'titulo') {
      setEditedTitulo(item.staging.titulo);
      setIsEditingTitulo(false);
    } else {
      setEditedDescricao(item.staging.descricao);
      setIsEditingDescricao(false);
    }
  };

  if (!item.legacy) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Item não encontrado na Produção
        </h3>
        <p className="text-red-600 mt-2">Edital: {item.staging.edital}</p>
        <p className="text-sm text-red-500 mt-1">Não é possível auditar um item que não existe no legado.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-xl font-bold text-gray-900">Auditoria de Conflitos</h2>
          <span className={clsx(
            "px-3 py-1 rounded-full text-sm font-medium",
            item.staging.status === 'SYNCED' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
          )}>
            {item.staging.status === 'SYNCED' ? 'Sincronizado' : 'Pendente'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Production (Legacy) */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Atual (Produção)</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-600">Título</label>
                <div className="p-2 bg-white border border-gray-200 rounded text-sm text-gray-900 min-h-[40px]">
                  {item.legacy.titulo}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600">Descrição</label>
                <div className="p-2 bg-white border border-gray-200 rounded text-sm text-gray-900 min-h-[80px]">
                  {item.legacy.descricao}
                </div>
              </div>
            </div>
          </div>

          {/* Staging (New) - Clickable */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-4">Novo (Site) - Clique para selecionar</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-blue-600">Título</label>
                  {!isEditingTitulo && (
                    <button
                      onClick={() => setIsEditingTitulo(true)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      title="Editar título antes de sincronizar"
                    >
                      <Edit2 className="w-3 h-3" />
                      Editar
                    </button>
                  )}
                </div>
                
                {isEditingTitulo ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedTitulo}
                      onChange={(e) => setEditedTitulo(e.target.value)}
                      className="w-full p-2 border-2 border-blue-400 rounded text-sm min-h-[60px] focus:outline-none focus:border-blue-600 resize-none text-gray-900 bg-white"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit('titulo')}
                        disabled={isSavingEdit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        {isSavingEdit ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={() => handleCancelEdit('titulo')}
                        disabled={isSavingEdit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 disabled:opacity-50 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => toggleChange('titulo')}
                    className={clsx(
                      'p-2 border-2 rounded text-sm min-h-[40px] cursor-pointer transition-all',
                      selectedChanges.titulo
                        ? 'bg-green-50 border-green-500 text-gray-900 shadow-md'
                        : 'bg-white border-blue-200 text-gray-900 hover:border-blue-400'
                    )}
                    title={selectedChanges.titulo ? 'Clique para NÃO atualizar' : 'Clique para atualizar'}
                  >
                    {selectedChanges.titulo && <span className="text-green-600 font-bold mr-2">✓</span>}
                    {editedTitulo}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-blue-600">Descrição</label>
                  {!isEditingDescricao && (
                    <button
                      onClick={() => setIsEditingDescricao(true)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      title="Editar descrição antes de sincronizar"
                    >
                      <Edit2 className="w-3 h-3" />
                      Editar
                    </button>
                  )}
                </div>
                
                {isEditingDescricao ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedDescricao}
                      onChange={(e) => setEditedDescricao(e.target.value)}
                      className="w-full p-2 border-2 border-blue-400 rounded text-sm min-h-[120px] focus:outline-none focus:border-blue-600 resize-y text-gray-900 bg-white"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit('descricao')}
                        disabled={isSavingEdit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        {isSavingEdit ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={() => handleCancelEdit('descricao')}
                        disabled={isSavingEdit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 disabled:opacity-50 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => toggleChange('descricao')}
                    className={clsx(
                      'p-2 border-2 rounded text-sm min-h-[80px] cursor-pointer transition-all whitespace-pre-wrap',
                      selectedChanges.descricao
                        ? 'bg-green-50 border-green-500 text-gray-900 shadow-md'
                        : 'bg-white border-blue-200 text-gray-900 hover:border-blue-400'
                    )}
                    title={selectedChanges.descricao ? 'Clique para NÃO atualizar' : 'Clique para atualizar'}
                  >
                    {selectedChanges.descricao && <span className="text-green-600 font-bold mr-2">✓</span>}
                    {editedDescricao}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t mt-2">
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={isSyncing || item.staging.status === 'SYNCED'}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSyncing ? 'Sincronizando...' : (
              <>
                <Check className="w-4 h-4" />
                Confirmar Alterações & Atualizar Produção
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Confirmar Alterações</h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Você está prestes a atualizar os seguintes campos na produção:
            </p>

            <div className="space-y-4">
              {selectedChanges.titulo && (
                <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-orange-900 mb-2">Título</h4>
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs">
                    <div>
                      <p className="text-gray-600 mb-1">De (Atual):</p>
                      <p className="bg-white p-2 rounded border text-gray-900">{item.legacy?.titulo}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-orange-600" />
                    <div>
                      <p className="text-gray-600 mb-1">Para (Novo):</p>
                      <p className="bg-white p-2 rounded border text-gray-900">{editedTitulo}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedChanges.descricao && (
                <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-orange-900 mb-2">Descrição</h4>
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs">
                    <div>
                      <p className="text-gray-600 mb-1">De (Atual):</p>
                      <p className="bg-white p-2 rounded border text-gray-900 max-h-32 overflow-y-auto">{item.legacy?.descricao}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-orange-600" />
                    <div>
                      <p className="text-gray-600 mb-1">Para (Novo):</p>
                      <p className="bg-white p-2 rounded border text-gray-900 max-h-32 overflow-y-auto whitespace-pre-wrap">{editedDescricao}</p>
                    </div>
                  </div>
                </div>
              )}

              {!selectedChanges.titulo && !selectedChanges.descricao && (
                <p className="text-sm text-gray-500 italic">Nenhum campo selecionado para atualização.</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSync}
                disabled={!selectedChanges.titulo && !selectedChanges.descricao}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Confirmar & Atualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
