import { TextField } from "@mui/material";
import { styled } from "@mui/material/styles";

const StyledTextField = styled(TextField)(({ theme }) => ({
  fontSize: "0.85rem",
  "& .MuiInputBase-input": { fontSize: "0.85rem" },
  "& .MuiFormLabel-root": { fontSize: "0.8rem" },
  "& .MuiSelect-select": { fontSize: "0.85rem" },
}));

export default StyledTextField;