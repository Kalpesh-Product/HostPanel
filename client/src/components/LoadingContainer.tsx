import { CircularProgress } from "@mui/material";

interface LoadingContainerProps {
  height?: string;
}

const LoadingContainer = ({ height }: LoadingContainerProps) => {
  return (
    <div className={`flex w-full items-center justify-center ${height || "40vh"}`}>
      <CircularProgress />
    </div>
  );
};

export default LoadingContainer;