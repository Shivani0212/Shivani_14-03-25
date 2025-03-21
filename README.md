# Store_Monitoring_node

## Overview

This project provides backend APIs to monitor the uptime and downtime of restaurants based on periodic status checks. The system processes store status, business hours, and timezone data to generate reports for restaurant owners.

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Additional Tools:** Mongoose, CSV Parser, Moment.js (for time handling)

## Data Sources

The system utilizes three CSV data sources:

1. **Store Status** (`store_id, timestamp_utc, status`)
   - Captures whether a store is `active` or `inactive` at a given UTC timestamp.

2. **Business Hours** (`store_id, dayOfWeek, start_time_local, end_time_local`)
   - Specifies store opening and closing hours in local time.
   - If missing, assume the store operates 24/7.

3. **Timezones** (`store_id, timezone_str`)
   - Provides the store's timezone.
   - If missing, assume `America/Chicago`.

## API Endpoints

### 1. Trigger Report Generation

**Endpoint:**  
`POST /trigger_report`

**Description:**  
Initiates report generation.

**Request:**  
_No input required._

**Response:**  
`json
{
  "report_id": "random_generated_string"
}`

---

### 2. Get Report Status or Download CSV

**Endpoint:**  
`GET /get_report?report_id=<report_id>`

**Description:**  
Retrieves the status of report generation or the final CSV file.

**Request:**  
- `report_id` (Query Parameter) - The ID received from `/trigger_report`.

**Response:**  
- If report generation is still in progress:
  `json
  {
    "status": "Running"
  }
  `
- If report generation is complete, returns the CSV file.

---

## Report Schema

The generated report includes:

| store_id | uptime_last_hour (min) | uptime_last_day (hrs) | uptime_last_week (hrs) | downtime_last_hour (min) | downtime_last_day (hrs) | downtime_last_week (hrs) |
|----------|------------------------|-----------------------|------------------------|-------------------------|-------------------------|--------------------------|

## Installation

1. Clone the repository:
   `git clone https://github.com/your-username/store-monitoring-system.git`
2. change directory
   `cd store-monitoring-system/backend`
3. Install dependencies:
   `npm install`
4. Set up MongoDB and load CSV data.

5. Start the server:
   `npm run dev`


## Improvements

1. **Optimize Database Queries**  
   - Use MongoDB indexing on `store_id` and `timestamp_utc` to improve query performance for status retrieval.

2. **Error Handling and Logging**  
   - Integrate a centralized logging system (e.g., Winston or Morgan) to log API requests, errors, and report generation progress for better debugging.