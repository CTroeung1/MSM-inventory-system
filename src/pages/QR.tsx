import { useParams, useNavigate } from "react-router-dom";
import { trpc } from "@/client/trpc";
import Loading from "@/components/misc/loading";
import ErrorPage from "./Error";

export default function QR() {
  const path = useParams()["*"];
  const navigate = useNavigate();
  if (path) {
    const { data, isLoading, error } = trpc.qr.translatePath.useQuery({ path });
    if (isLoading && !data) {
      return (
        <div className="container mx-auto py-10 mb-10">
          <div className="py-10">
            <Loading />
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="container mx-auto py-10 mb-10">
          <ErrorPage message={error.message} />
        </div>
      );
    }
    if (data) {
      void navigate(data);
    }
  } else void navigate("/dashboard");
}
