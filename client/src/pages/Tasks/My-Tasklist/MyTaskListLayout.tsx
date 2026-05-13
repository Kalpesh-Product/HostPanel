import { Outlet } from "react-router-dom";

const MyTaskListLayout = () => {
  return (
    <div className="p-4">
      <div className="py-4">
        <Outlet />
      </div>
    </div>
  );
};

export default MyTaskListLayout;