"use client";

// Paginación real: siempre muestra la primera y la última página, más una
// ventana alrededor de la página actual.
import styles from "./Reportes.module.css";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const ventana = 2;
  const pages = [];

  for (let p = 1; p <= totalPages; p++) {
    if (
      p === 1 ||
      p === totalPages ||
      Math.abs(p - currentPage) <= ventana
    ) {
      pages.push(p);
    }
  }

  const items = [];
  let anterior = 0;
  pages.forEach((p) => {
    if (p - anterior > 1) {
      items.push(
        <span key={`ellipsis-${anterior}-${p}`} className={styles.pageEllipsis}>
          ...
        </span>
      );
    }
    items.push(
      <button
        key={p}
        type="button"
        className={p === currentPage ? styles.pageActive : ""}
        onClick={() => onPageChange(p)}
      >
        {p}
      </button>
    );
    anterior = p;
  });

  return (
    <div className={styles.pagination}>
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        ‹
      </button>
      {items}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        ›
      </button>
    </div>
  );
}