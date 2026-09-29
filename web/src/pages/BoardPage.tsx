import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import Board from "../components/Board";
import { ErrorBox, Spinner } from "../components/ui";

const PARAMS = { q: "", sort: "updated", status: [] };

export default function BoardPage() {
  const queryKey = ["applications", PARAMS];
  const { data, isPending, error } = useQuery({ queryKey, queryFn: () => api.list(PARAMS) });
  return (
    <div className="board-page">
      <div className="page-head" style={{ marginBottom: 12 }}>
        <h1 className="page-title">Board</h1>
      </div>
      {isPending ? <Spinner /> : error ? <ErrorBox error={error} /> : <Board apps={data} queryKey={queryKey} />}
    </div>
  );
}
