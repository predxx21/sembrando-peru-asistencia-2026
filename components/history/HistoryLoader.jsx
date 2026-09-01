'use client';

import { useEffect, useState } from 'react';
import { getHistoryActivities } from './historyData';
import HistoryDashboard from './ListadoHistorial';
import styles from './Loaders.module.css';

const ITEMS_PER_PAGE = 6;

export default function HistoryLoader() {
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activities, setActivities] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      try {
        setLoaded(false);
        const result = await getHistoryActivities({
          page,
          limit: ITEMS_PER_PAGE,
          busqueda: search || undefined,
          estado: filterStatus !== 'todos' ? filterStatus : undefined,
        });
        if (isMounted) {
          setActivities(result.activities);
          setTotal(result.total);
          setError('');
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'No se pudo cargar el historial.');
        }
      } finally {
        if (isMounted) {
          setLoaded(true);
        }
      }
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [page, search, filterStatus]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1) {
      setPage(newPage);
    }
  };

  if (error) {
    return <div className={styles.errorContainer}>{error}</div>;
  }

  if (!loaded) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} aria-hidden="true"></div>
        <p className={styles.loadingText}>Cargando historial...</p>
      </div>
    );
  }

  return (
    <HistoryDashboard
      activities={activities}
      total={total}
      page={page}
      limit={ITEMS_PER_PAGE}
      onPageChange={handlePageChange}
      search={search}
      filterStatus={filterStatus}
      onSearchChange={setSearch}
      onFilterChange={setFilterStatus}
    />
  );
}