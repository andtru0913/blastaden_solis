import { createHash, createHmac } from "crypto";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from "chart.js";

/**
 * Generates an MD5 hash of the provided body and returns it in base64 format.
 *
 * @param {string} body - The body content to be hashed.
 * @returns {string} The MD5 hash of the body, encoded in base64.
 */
function getContentMd5(body) {
  return createHash("md5").update(body).digest("base64");
}

/**
 * Returns the current date and time in GMT (UTC) format.
 *
 * @returns {string} The current date and time in UTC string format.
 */
function getGMTDate() {
  return new Date().toUTCString();
}

/**
 * Generates a HMAC-SHA1 signature for the Solis API request.
 * The signature is based on the provided content MD5, date, path, and secret key.
 *
 * @param {string} contentMd5 - The MD5 hash of the request body in base64 format.
 * @param {string} date - The current date in GMT format.
 * @param {string} path - The API path being requested.
 * @param {string} secret - The secret key used to generate the HMAC signature.
 * @returns {string} The HMAC-SHA1 signature encoded in base64.
 */
function getSignature(contentMd5, date, path, secret) {
  const signatureString = `POST\n${contentMd5}\napplication/json\n${date}\n${path}`;
  return createHmac("sha1", secret).update(signatureString).digest("base64");
}

/**
 * Sends a POST request to the Solis API with the specified path and request body.
 * It includes necessary headers such as Authorization, Content-MD5, Date, etc.
 *
 * @param {string} path - The API endpoint path (e.g., '/v1/api/userStationList').
 * @param {Object} bodyObject - The request body to be sent with the POST request.
 * @returns {Promise<Object>} The response body as a parsed JSON object.
 * @throws {Error} Throws an error if the response is not OK (status code is not in the 200-299 range).
 */
async function sendSolisApiRequest(path, bodyObject) {
  const url = "https://www.soliscloud.com:13333" + path;
  const bodyString = JSON.stringify(bodyObject);
  const contentMd5 = getContentMd5(bodyString);
  const date = getGMTDate();
  const signature = getSignature(
    contentMd5,
    date,
    path,
    process.env.API_SECRET,
  );

  const headers = {
    "Content-Type": "application/json;charset=UTF-8",
    Authorization: `API ${process.env.API_KEY}:${signature}`,
    "Content-MD5": contentMd5,
    Date: date,
    Connection: "keep-alive",
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: bodyString,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorBody}`);
  }

  return await response.json();
}

/**
 * Fetches data for all user stations and aggregates energy data.
 * It sends requests to the Solis API and accumulates daily and monthly totals.
 *
 * @returns {Promise<{ dailyTotals: number[], monthlyTotal: number, error: string | null }>}
 * - dailyTotals: An array of energy totals for each day.
 * - monthlyTotal: The total energy for the entire month.
 * - error: A string error message if data fetching fails.
 */
async function fetchData() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const monthStr = `${year}-${month}`;
    const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();

    const stationListResponse = await sendSolisApiRequest(
      "/v1/api/userStationList/",
      {
        pageNo: 1,
        pageSize: 100,
      },
    );

    const dayTotals = Array(daysInMonth).fill(0);

    for (const station of stationListResponse.data.page.records) {
      const stationId = station.id;

      try {
        const response = await sendSolisApiRequest("/v1/api/stationMonth", {
          id: stationId,
          money: "SEK",
          month: monthStr,
        });

        const dailyData = response.data;

        for (let i = 0; i < daysInMonth; i++) {
          const energy = dailyData[i]?.energy || 0;
          dayTotals[i] += energy;
        }
      } catch (error) {
        console.error(`Failed for station ${stationId}:`, error.message);
      }
    }

    const roundedTotals = dayTotals.map((e) => Math.round(e * 10) / 10);
    const monthlyTotal =
      Math.round(dayTotals.reduce((acc, val) => acc + val, 0) * 10) / 10;

    return {
      dailyTotals: roundedTotals,
      monthlyTotal,
      monthName: now.toLocaleString("sv-SE", { month: "long" }),
    };
  } catch (error) {
    console.error("Failed:", error.message);
    return { error: "Failed to fetch data" };
  }
}

/**
 * Fetches data at build time and provides it as props to a Next.js page.
 *
 * @returns {Promise<Object>} An object containing:
 *   - `props` (Object): The data to be passed to the page component:
 *     - `dailyTotals` (Array): Daily totals,
 *     - `monthlyTotal` (Number): Monthly total
 *     - `error` (any): Error from fetching data
 *   - `revalidate` (Number): Time in seconds (3600 for 1 hour) to trigger regeneration.
 */
export async function getStaticProps() {
  const data = await fetchData();

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
 * Page component that receives and displays energy data passed as props.
 *
 * @param {Object} props - The props passed to the page component.
 * @param {number[]} props.dailyTotals - The daily energy totals.
 * @param {number} props.monthlyTotal - The monthly energy total.
 * @param {string | null} props.error - An error message if the data fetching fails.
 * @returns {JSX.Element} The JSX element to render.
 */
export default function Page({ dailyTotals, monthlyTotal, monthName, error }) {
  if (error) {
    return <div>Error: {error}</div>;
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

  const formatted_monthlyTotal = new Intl.NumberFormat('sv-SE').format(monthlyTotal)
  return (
      <div className="flex flex-col items-center p-8">
        <div className="w-full max-w-3xl bg-gray-100 p-6 rounded-2xl shadow-md">
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
