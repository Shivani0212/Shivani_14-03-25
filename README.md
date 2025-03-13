# Store_Monitoring_node

## Overview

This project provides backend APIs to monitor the uptime and downtime of restaurants based on periodic status checks. The system processes store status, business hours, and timezone data to generate reports for restaurant owners.

## Tech Stack

- **Frontend:** React.js
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Additional Tools:** Mongoose, CSV Parser, Moment.js (for time handling)

## Data Sources

The system utilizes three CSV data sources:

1. **Store Status** (\`store_id, timestamp_utc, status\`)
   - Captures whether a store is \`active\` or \`inactive\` at a given UTC timestamp.

2. **Business Hours** (\`store_id, dayOfWeek, start_time_local, end_time_local\`)
   - Specifies store opening and closing hours in local time.
   - If missing, assume the store operates 24/7.

3. **Timezones** (\`store_id, timezone_str\`)
   - Provides the store's timezone.
   - If missing, assume \`America/Chicago\`.

## System Requirements

- Data updates dynamically every hour.
- CSV data is stored in MongoDB for real-time processing.
- Uptime and downtime calculations consider only business hours.
- Missing observations are interpolated to estimate uptime/downtime accurately.

## API Endpoints

### 1. Trigger Report Generation

**Endpoint:**  
\`POST /trigger_report\`

**Description:**  
Initiates report generation.

**Request:**  
_No input required._

**Response:**  
\`\`\`json
{
  "report_id": "random_generated_string"
}
\`\`\`

---

### 2. Get Report Status or Download CSV

**Endpoint:**  
\`GET /get_report?report_id=<report_id>\`

**Description:**  
Retrieves the status of report generation or the final CSV file.

**Request:**  
- \`report_id\` (Query Parameter) - The ID received from \`/trigger_report\`.

**Response:**  
- If report generation is still in progress:
  \`\`\`json
  {
    "status": "Running"
  }
  \`\`\`
- If report generation is complete, returns the CSV file.

---

## Report Schema

The generated report includes:

| store_id | uptime_last_hour (min) | uptime_last_day (hrs) | uptime_last_week (hrs) | downtime_last_hour (min) | downtime_last_day (hrs) | downtime_last_week (hrs) |
|----------|------------------------|-----------------------|------------------------|-------------------------|-------------------------|--------------------------|

## Installation

1. Clone the repository:
   \`\`\`sh
   git clone https://github.com/your-username/store-monitoring-system.git
   cd store-monitoring-system
   \`\`\`
2. Install dependencies:
   \`\`\`sh
   npm install
   \`\`\`
3. Set up MongoDB and load CSV data.

4. Start the server:
   \`\`\`sh
   npm run server
   \`\`\`

