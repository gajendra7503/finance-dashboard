import { createContext, useContext, useState, type ReactNode } from "react";

interface FilterState {
  category: string;
  startDate: string;
  endDate: string;
}

interface FilterContextProps extends FilterState {
  setCategory: (val: string) => void;
  setStartDate: (val: string) => void;
  setEndDate: (val: string) => void;
}

const FilterContext = createContext<FilterContextProps | null>(null);

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return (
    <FilterContext.Provider value={{ category, startDate, endDate, setCategory, setStartDate, setEndDate }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used inside FilterProvider");
  return ctx;
};
