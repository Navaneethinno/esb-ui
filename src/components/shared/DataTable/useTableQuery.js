import { useCallback, useEffect, useMemo, useState } from "react";
import { buildColumnSearchOptions, filterRowsBySearch, paginateRows } from "./tableSearch";

export default function useTableQuery(rows = [], columns = [], options = {}) {
  const {
    defaultPageSize = 10,
    defaultSearchColumn = "all",
    allColumnsLabel = "All Columns",
  } = options;

  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchColumn, setSearchColumn] = useState(defaultSearchColumn);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const searchOptions = useMemo(
    () => buildColumnSearchOptions(columns, allColumnsLabel),
    [allColumnsLabel, columns],
  );

  const applySearch = useCallback(() => {
    setAppliedSearchText(searchText.trim());
    setCurrentPage(1);
  }, [searchText]);

  const clearSearch = useCallback(() => {
    setSearchText("");
    setAppliedSearchText("");
    setSearchColumn(defaultSearchColumn);
    setCurrentPage(1);
  }, [defaultSearchColumn]);

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedSearchText, searchColumn, pageSize]);

  const filteredRows = useMemo(
    () => filterRowsBySearch(rows, appliedSearchText, searchColumn, columns),
    [appliedSearchText, columns, rows, searchColumn],
  );

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / Math.max(1, pageSize)));

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  const pagedRows = useMemo(
    () => paginateRows(filteredRows, currentPage, pageSize),
    [currentPage, filteredRows, pageSize],
  );

  return {
    searchText,
    setSearchText,
    appliedSearchText,
    searchColumn,
    setSearchColumn,
    applySearch,
    clearSearch,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    pageCount,
    totalRows: filteredRows.length,
    filteredRows,
    pagedRows,
    searchOptions,
  };
}
