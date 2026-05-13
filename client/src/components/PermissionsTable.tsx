import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Paper,
} from "@mui/material";

interface PermissionSubmodule {
  submoduleName: string;
  grantedActions: string[];
  [key: string]: unknown;
}

interface PermissionModule {
  name: string;
  submodules: PermissionSubmodule[];
  [key: string]: unknown;
}

interface PermissionsTableProps {
  modules: PermissionModule[];
  onPermissionChange: (modules: PermissionModule[]) => void;
}

const PermissionsTable = ({ modules, onPermissionChange }: PermissionsTableProps) => {
  const [permissions, setPermissions] = useState<PermissionModule[]>(modules);

  const handleCheckboxChange = (moduleIndex: number, submoduleIndex: number, action: string) => {
    const updatedPermissions = [...permissions];
    const submodule = updatedPermissions[moduleIndex].submodules[submoduleIndex];

    if (submodule.grantedActions.includes(action)) {
      submodule.grantedActions = submodule.grantedActions.filter((currentAction) => currentAction !== action);
    } else {
      submodule.grantedActions.push(action);
    }

    setPermissions(updatedPermissions);
    onPermissionChange(updatedPermissions);
  };

  return (
    <div className="mt-4 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {permissions.map((module, moduleIndex) => (
          <div key={module.name}>
            <span className="text-subtitle mb-2 font-pregular">{module.name}</span>

            <TableContainer style={{ height: 400, overflowY: "scroll" }} component={Paper} className="mb-4">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Submodule</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Read</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Write</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {module.submodules.map((submodule, submoduleIndex) => (
                    <TableRow key={submodule.submoduleName}>
                      <TableCell>{submodule.submoduleName}</TableCell>
                      <TableCell>
                        <Checkbox
                          checked={submodule.grantedActions.includes("View")}
                          onChange={() => handleCheckboxChange(moduleIndex, submoduleIndex, "View")}
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={submodule.grantedActions.includes("Edit")}
                          onChange={() => handleCheckboxChange(moduleIndex, submoduleIndex, "Edit")}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PermissionsTable;