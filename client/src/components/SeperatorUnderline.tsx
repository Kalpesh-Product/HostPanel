interface SeperatorUnderlineProps {
  title: string;
  smallText?: boolean;
}

const SeperatorUnderline = ({ title, smallText = false }: SeperatorUnderlineProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className="h-[0.05rem] w-full bg-borderGray"></div>
      <div className={`${smallText ? "text-content whitespace-nowrap" : "text-content"} text-borderGray`}>
        {title}
      </div>
      <div className="h-[0.05rem] w-full bg-borderGray"></div>
    </div>
  );
};

export default SeperatorUnderline;