/**
 * This page is the main page that fetches data from solis and displays the bar diagram
 */

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from "chart.js";
import {fetchDataFromSolis} from "@/components/utils";

/**
 * Fetches data and provides it as props to a Next.js page.
 *
 * @returns {Promise<Object>} An object containing:
 *   - `props` (Object): The data to be passed to the page component:
 *     - `dailyTotals` (Array): Daily totals,
 *     - `monthlyTotal` (Number): Monthly total
 *     - `error` (any): Error from fetching data
 */
export async function getServerSideProps() {
  const data = await fetchDataFromSolis();

  return {
    props: {
      dailyTotals: data.dailyTotals || [],
      monthlyTotal: data.monthlyTotal || 0,
      monthName: data.monthName || "",
      error: data.error || null,
    },
  };
}

/**
 * Page component that receives props and display the page
 *
 * @param {Object} props - The props passed to the page component.
 * @param {number[]} props.dailyTotals - The daily energy totals.
 * @param {number} props.monthlyTotal - The monthly energy total.
 * @param {string | null} props.error - An error message if the data fetching fails.
 * @returns {JSX.Element} The JSX element to render.
 */
export default function Page({ dailyTotals, monthlyTotal, monthName, error }) {
  if (error) {
    return <div>{error}</div>;
  }

  ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);
  const chartData = {
    labels: dailyTotals.map((_, index) => index + 1),
    datasets: [
      {
        data: dailyTotals,
        backgroundColor: "rgba(45, 95, 149, 1)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (tooltipItems) => {
            const day = tooltipItems[0].label;
            return `${day} ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
          },
          label: (tooltipItem) => `${tooltipItem.raw} kWh`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          display: true,
        },
      },
    },
  };

  /* Formatting the total generated power */
  const formatted_monthlyTotal = new Intl.NumberFormat('sv-SE').format(monthlyTotal);

  return (
      <div className="flex flex-col items-center m-8 bg-white">
        <div className="w-full bg-gray-100 p-6 rounded-2xl shadow-md">
          <h3 className="p-2 text-xl font-bold text-gray-800">Producerad el under månaden - {monthName}</h3>
          <div className="flex flex-row-reverse items-center">
            <h4 className="p-2 text-sm text-gray-700">
              Total: {formatted_monthlyTotal} kWh
            </h4>
          </div>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
  );
}