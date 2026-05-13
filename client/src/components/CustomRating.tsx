import type { ComponentProps } from "react";
import { styled, Rating } from "@mui/material";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import SentimentSatisfiedIcon from "@mui/icons-material/SentimentSatisfied";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAltOutlined";
import SentimentVerySatisfiedIcon from "@mui/icons-material/SentimentVerySatisfied";

const StyledRating = styled(Rating)(({ theme }) => ({
  "& .MuiRating-iconEmpty .MuiSvgIcon-root": {
    color: theme.palette.action.disabled,
  },
}));

const customIcons = {
  1: { icon: <SentimentVeryDissatisfiedIcon color="error" />, label: "Very Dissatisfied" },
  2: { icon: <SentimentDissatisfiedIcon color="error" />, label: "Dissatisfied" },
  3: { icon: <SentimentSatisfiedIcon color="warning" />, label: "Neutral" },
  4: { icon: <SentimentSatisfiedAltIcon color="success" />, label: "Satisfied" },
  5: { icon: <SentimentVerySatisfiedIcon color="success" />, label: "Very Satisfied" },
} as const;

type IconContainerProps = ComponentProps<"span"> & { value?: keyof typeof customIcons };

function IconContainer({ value, ...other }: IconContainerProps) {
  return <span {...other}>{value ? customIcons[value]?.icon : null}</span>;
}

const CustomRating = (props: ComponentProps<typeof Rating>) => (
  <StyledRating
    {...props}
    IconContainerComponent={IconContainer as ComponentProps<typeof Rating>["IconContainerComponent"]}
    getLabelText={(value) => customIcons[value as keyof typeof customIcons]?.label || ""}
    highlightSelectedOnly
  />
);

export default CustomRating;