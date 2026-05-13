import Chart from "react-apexcharts";

interface LineGraphProps {
  options: any;
  data: any;
}

const LineGraph = ({ options, data }: LineGraphProps) => {
  return (
    <div>
      <Chart options={options} series={data} type="line" height={350} />
    </div>
  );
};

export default LineGraph;