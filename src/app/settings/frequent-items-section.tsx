"use client";

import { useState, useEffect, useCallback } from "react";
import type { FrequentItem, FrequentItemInput } from "@/lib/frequent-items";
import { FrequentItemCard } from "./frequent-item-card";
import { FrequentItemModal } from "./frequent-item-modal";

export function FrequentItemsSection() {
  const [items, setItems] = useState<FrequentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FrequentItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FrequentItem | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/frequent-items");
      if (!res.ok) {
        throw new Error("Erro ao carregar produtos");
      }
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: FrequentItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (item: FrequentItem) => {
    setDeleteConfirm(item);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const res = await fetch(`/api/frequent-items/${deleteConfirm.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Erro ao eliminar produto");
      }

      setItems((prev) => prev.filter((i) => i.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao eliminar");
    }
  };

  const handleSave = async (data: FrequentItemInput) => {
    if (editingItem) {
      // Update existing
      const res = await fetch(`/api/frequent-items/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error ?? "Erro ao atualizar produto");
      }

      const { item } = await res.json();
      setItems((prev) => prev.map((i) => (i.id === editingItem.id ? item : i)));
    } else {
      // Create new
      const res = await fetch("/api/frequent-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error ?? "Erro ao criar produto");
      }

      const { item } = await res.json();
      setItems((prev) => [item, ...prev]);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Produtos Frequentes
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
          Gere os teus produtos mais usados
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Define valores padrão para agilizar o processo de adicionar itens.
        </p>
      </div>

      <button
        type="button"
        onClick={handleAddNew}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Adicionar Produto Frequente
      </button>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      )}

      {isLoading && (
        <p className="py-8 text-center text-slate-500 dark:text-slate-400">
          A carregar produtos...
        </p>
      )}

      {!isLoading && items.length === 0 && (
        <p className="py-8 text-center text-slate-500 dark:text-slate-400">
          Ainda não tens produtos frequentes. Adiciona o primeiro!
        </p>
      )}

      {!isLoading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <FrequentItemCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <FrequentItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingItem={editingItem}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Eliminar produto?
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Tens a certeza que queres eliminar &quot;{deleteConfirm.name}&quot;? Esta ação não pode ser revertida.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white transition hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
