import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export function useTrash<T>(endpoint: string, onSave: () => void) {
  const [trash, setTrash] = useState<T[]>([]);

  const loadTrash = useCallback(() => {
    api.get<T[]>(`${endpoint}/trash`).then(setTrash);
  }, [endpoint]);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const reload = () => {
    onSave();
    loadTrash();
  };

  const remove = async (id: number) => {
    await api.del(`${endpoint}/${id}`);
    reload();
  };

  return { trash, reload, remove };
}
