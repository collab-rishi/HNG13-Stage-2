# Country Currency & Exchange API

A RESTful API that fetches country data from external APIs, stores it in a MySQL database, and provides CRUD operations with exchange rates and estimated GDP.

## Features

* Fetches countries from [REST Countries API](https://restcountries.com/v2/all)
* Fetches exchange rates from [Open Exchange Rates API](https://open.er-api.com/v6/latest/USD)
* Stores country info with `currency_code`, `exchange_rate`, `estimated_gdp`
* Provides endpoints:

  * `POST /countries/refresh` – fetch & cache countries
  * `GET /countries` – list countries with filtering and sorting
  * `GET /countries/:name` – get single country
  * `DELETE /countries/:name` – delete a country
  * `GET /status` – total countries & last refresh timestamp
  * `GET /countries/image` – summary image with top 5 GDP


## Prerequisites

* Node.js v18+
* MySQL 8+
* `npm` or `yarn`
* Optional: `canvas` dependencies for image generation (Linux: `sudo apt install libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev build-essential g++`)


## Installation

1. **Clone the repo**

```bash
git clone https://github.com/yourusername/country-api.git
cd country-api

### Step 2: Install dependencies

```bash
npm install

### Step 3: Setup environment variables

Create a `.env` file in the root:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=country_api
COUNTRIES_API_URL=https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies
EXCHANGE_API_URL=https://open.er-api.com/v6/latest/USD
```

### Step 4: Initialize database

```sql
CREATE DATABASE country_api;
USE country_api;

-- Countries table
CREATE TABLE countries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  capital VARCHAR(255),
  region VARCHAR(255),
  population BIGINT NOT NULL,
  currency_code VARCHAR(10),
  exchange_rate DOUBLE,
  estimated_gdp DOUBLE,
  flag_url VARCHAR(255),
  last_refreshed_at DATETIME
);

-- Metadata table
CREATE TABLE metadata (
  `key` VARCHAR(50) PRIMARY KEY,
  `value` VARCHAR(255)
);
```
## Running the API

```bash
npm start
```

## API Endpoints

| Method | Endpoint             | Description                                                                          |
| ------ | -------------------- | ------------------------------------------------------------------------------------ |
| POST   | `/countries/refresh` | Fetch all countries & exchange rates, cache in DB, generate summary image            |
| GET    | `/countries`         | Get all countries. Query params: `?region=Africa`, `?currency=NGN`, `?sort=gdp_desc` |
| GET    | `/countries/:name`   | Get a single country by name (case-insensitive)                                      |
| DELETE | `/countries/:name`   | Delete a country by name                                                             |
| GET    | `/status`            | Total countries & last refresh timestamp                                             |
| GET    | `/countries/image`   | Serve cached summary image                                                           |



## Error Handling

* **400 Bad Request** – validation errors
* **404 Not Found** – country not found
* **503 Service Unavailable** – external API unavailable
* **500 Internal Server Error** – unexpected errors

Sample validation error:

```json
{
  "error": "Validation failed",
  "details": {
    "currency_code": "is required"
  }
}
```

## Notes

* Random multiplier (1000–2000) is generated fresh on each refresh for `estimated_gdp`
* Empty currencies → `currency_code = null`, `exchange_rate = null`, `estimated_gdp = 0`
* `/countries/refresh` updates `last_refreshed_at` in `metadata` table
* Summary image is saved at `cache/summary.png`
