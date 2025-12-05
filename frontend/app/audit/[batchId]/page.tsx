'use client';

import { useState, useEffect, use } from 'react';
import axios from 'axios';
import { DiffViewer } from '@/components/DiffViewer';
import { CheckCircle2, AlertCircle, ArrowLeft, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { useSearchParams } from 'next/navigation';

interface AuditItem {
  staging: {
    id: number;
    titulo: string;
    descricao: string;
    edital: string;
    status: string;
    processo: string;
  };
  legacy: {
    id: number;
    titulo: string;
    descricao: string;
    edital: string;
  } | null;
  diff: boolean;
}

export default function ReviewPage({ params }: { params: Promise<{ batchId: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const mapping = {
    edital: searchParams.get('map_edital') ?? undefined,
    titulo: searchParams.get('map_titulo') ?? undefined,
    descricao: searchParams.get('map_descricao') ?? undefined,
  };
  const keyField = searchParams.get('key_field') ?? 'edital';
  
  console.log('DEBUG - Frontend mapping:', mapping);
  console.log('DEBUG - Frontend keyField:', keyField);

  useEffect(() => {
    fetchItems(1);
  }, [resolvedParams.batchId]);

  const fetchItems = async (page = pagination.page) => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        map_edital: mapping.edital || '',
        map_titulo: mapping.titulo || '',
        map_descricao: mapping.descricao || '',
        page: page.toString(),
        limit: pagination.limit.toString(),
        key_field: keyField
      }).toString();
      
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/audit/${resolvedParams.batchId}?${query}`);
      
      // Handle response format change (now returns object with data and meta)
      const data = res.data.data || res.data; 
      const meta = res.data.total ? { total: res.data.total, page: res.data.page, limit: res.data.limit } : pagination;

      setItems(data);
      setPagination(prev => ({ ...prev, ...meta, page }));

      if (data.length > 0 && !selectedItemId) {
        setSelectedItemId(data[0].staging.id);
      }
    } catch (error) {
      console.error('Failed to fetch items', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedItem = items.find(i => i.staging.id === selectedItemId);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>
          <h2 className="font-bold text-gray-900">Itens do Lote</h2>
          <p className="text-xs text-gray-600 truncate" title={resolvedParams.batchId}>{resolvedParams.batchId}</p>
          <p className="text-xs text-gray-500 mt-1">Total: {pagination.total} itens</p>
        </div>
        
        {/* Mapping Status Banner */}
        {!mapping.edital ? (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">⚠️ Mapeamento não configurado!</p>
              <p className="text-xs text-red-800 mt-1">
                Volte ao dashboard e configure o mapeamento do banco de produção antes de auditar os itens.
              </p>
              <Link 
                href="/" 
                className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-red-700 hover:text-red-900 underline"
              >
                <ArrowLeft className="w-3 h-3" />
                Voltar ao Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mx-4 mb-2">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-900">Mapeamento em uso:</p>
                <p className="text-xs text-blue-700 mt-1">
                  Chave: <code className="bg-blue-100 px-1 rounded">{keyField}</code> → <code className="bg-blue-100 px-1 rounded">{mapping.edital}</code>
                  {mapping.titulo && (
                    <>, Título: <code className="bg-blue-100 px-1 rounded">{mapping.titulo}</code></>
                  )}
                  {mapping.descricao && (
                    <>, Descrição: <code className="bg-blue-100 px-1 rounded">{mapping.descricao}</code></>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.staging.id}
              onClick={() => setSelectedItemId(item.staging.id)}
              className={clsx(
                "w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-start gap-3",
                selectedItemId === item.staging.id && "bg-blue-50 border-l-4 border-l-blue-500"
              )}
            >
              {item.staging.status === 'SYNCED' ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{item.staging.edital}</p>
                <p className="text-xs text-gray-600 truncate">{item.staging.processo}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-white">
          <button
            onClick={() => fetchItems(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-4 py-2 text-sm bg-blue-600 text-white border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-700 font-medium">
            Pág {pagination.page} de {Math.ceil(pagination.total / pagination.limit) || 1}
          </span>
          <button
            onClick={() => fetchItems(pagination.page + 1)}
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
            className="px-4 py-2 text-sm bg-blue-600 text-white border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Próxima
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {selectedItem ? (
          <div className="max-w-5xl mx-auto">
            <DiffViewer 
              item={selectedItem} 
              onSync={() => fetchItems(pagination.page)} 
              mapping={mapping}
              keyField={keyField}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            {isLoading ? 'Carregando...' : 'Selecione um item para auditar'}
          </div>
        )}
      </main>
    </div>
  );
}
