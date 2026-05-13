import type { ReactNode } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { IoIosArrowForward } from "react-icons/io";
import { PERMISSIONS } from "../constants/permissions";
import Permissions from "./Permissions/Permissions";

interface MuiAccordionProps {
  data?: Array<Record<string, any>>;
  titleKey?: string;
  itemsKey?: string;
  itemClick?: (item: Record<string, any>) => void;
  disabledKey?: string;
}

const MuiAccordion = ({
  data = [],
  titleKey = "name",
  itemsKey = "items",
  itemClick,
  disabledKey = "",
}: MuiAccordionProps) => {
  const sortItems = (a: Record<string, any>, b: Record<string, any>) => {
    const isAdminA = a.role?.some((role: Record<string, any>) =>
      String(role.roleTitle).toLowerCase().includes("admin")
    );
    const isAdminB = b.role?.some((role: Record<string, any>) =>
      String(role.roleTitle).toLowerCase().includes("admin")
    );

    if (isAdminA && !isAdminB) return -1;
    if (!isAdminA && isAdminB) return 1;
    return String(a.firstName || "").localeCompare(String(b.firstName || ""));
  };

  const renderItem = (emp: Record<string, any>) => (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      p={1}
      border="1px solid #e0e0e0"
      borderRadius={2}
    >
      <Box>
        <Typography fontWeight={500}>
          {emp.firstName} {emp.lastName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {emp.role?.map((role: Record<string, any>) => role.roleTitle).join(", ")}
        </Typography>
      </Box>

      <Permissions permissions={[PERMISSIONS.ACCESS_PERMISSIONS]}>
        <div
          onClick={() => itemClick?.(emp)}
          className="border-default border-black bg-white p-2 text-content flex cursor-pointer items-center rounded-md text-black hover:border-primary hover:bg-primary hover:text-white"
        >
          <IoIosArrowForward />
        </div>
      </Permissions>
    </Box>
  );

  const sortedData = [...data].sort((a, b) => String(a[titleKey] || "").localeCompare(String(b[titleKey] || "")));

  const activeSections = sortedData.filter((section) => !disabledKey || section[disabledKey] !== false);
  const inactiveSections = sortedData.filter((section) => disabledKey && section[disabledKey] === false);

  const finalSections = [...activeSections, ...inactiveSections];

  return (
    <Box>
      <div className="mb-4">
        <span className="text-primary font-pmedium text-title">DEPARTMENTS</span>
      </div>
      {finalSections.map((section) => {
        const isDisabled = disabledKey && section[disabledKey] === false;
        const items = [...(section[itemsKey] || [])].sort(sortItems);

        return (
          <Accordion key={section._id} disableGutters>
            <AccordionSummary expandIcon={isDisabled ? null : <ExpandMoreIcon />}>
              <Typography fontWeight="bold">
                {section[titleKey]}
                {isDisabled && (
                  <Typography component="span" sx={{ fontSize: 12, color: "gray", marginLeft: 1 }}>
                    (Inactive)
                  </Typography>
                )}
              </Typography>
            </AccordionSummary>
            {!isDisabled && (
              <AccordionDetails>
                <Stack spacing={2}>
                  {items.map((item: Record<string, any>) => (
                    <Box key={item._id}>{renderItem(item)}</Box>
                  ))}
                </Stack>
              </AccordionDetails>
            )}
          </Accordion>
        );
      })}
    </Box>
  );
};

export default MuiAccordion;