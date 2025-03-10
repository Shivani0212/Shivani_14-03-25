import fetch from "node-fetch"; // Ensure 'node-fetch' is installed

const API_URL =
  "http://localhost:5000/api/report/get_report?report_id=1cd3c2a5-6893-4a5d-b555-0bc8cbe5374f"; // Change this URL if needed

// Function to convert CSV to JSON
const csvToJson = (csv) => {
  const [header, ...rows] = csv.trim().split("\n");
  const keys = header.split(",");

  return rows.map((row) => {
    const values = row.split(",");
    return keys.reduce((acc, key, index) => {
      acc[key.trim()] = values[index]?.trim();
      return acc;
    }, {});
  });
};

// Fetch data from API
const fetchReportData = async () => {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${response.status}`);
    }

    const csvData = await response.text(); // Read as text (since it's CSV)
    console.log("Raw CSV Response:\n", csvData);

    // Convert CSV to JSON
    const jsonData = csvToJson(csvData);
    console.log("Converted JSON Data:\n", JSON.stringify(jsonData, null, 2));

  } catch (error) {
    console.error("Error Fetching Data:", error.message);
  }
};

// Run the function
fetchReportData();
